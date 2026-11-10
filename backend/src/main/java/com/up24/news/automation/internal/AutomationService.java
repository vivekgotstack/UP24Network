package com.up24.news.automation.internal;

import com.fasterxml.jackson.databind.JsonNode;
import com.up24.news.article.ArticleDesk;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;
import org.w3c.dom.*;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import java.util.regex.Pattern;

@Service
class AutomationService {
    record Job(String key,String name,boolean enabled,int intervalMinutes,Instant nextRunAt,Instant lastRunAt,String lastResult,boolean running) {}
    static final String SITE_API="https://www.up24network.com/index.php?rest_route=/wp/v2/posts&per_page=30&_embed=1";
    static final String CHANNEL_ID="UC5Gu1A0d70QSUThd_7VrPew";
    private final JdbcTemplate jdbc;
    private final ArticleDesk articles;
    private final RestClient http;
    AutomationService(JdbcTemplate jdbc,ArticleDesk articles) {
        this.jdbc=jdbc; this.articles=articles;
        var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(15));
        this.http=RestClient.builder().requestFactory(factory).defaultHeader("User-Agent","UP24Network-newsroom/0.1").build();
    }
    List<Job> list() {
        return jdbc.query("SELECT * FROM automation_job ORDER BY job_key",(row,index)->new Job(row.getString("job_key"),row.getString("name"),row.getBoolean("enabled"),row.getInt("interval_minutes"),
                row.getTimestamp("next_run_at").toInstant(),row.getTimestamp("last_run_at")==null?null:row.getTimestamp("last_run_at").toInstant(),row.getString("last_result"),row.getBoolean("running")));
    }
    Job update(String key,boolean enabled,int minutes) {
        if(minutes<5||minutes>10080) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose an interval between 5 minutes and 7 days");
        if(jdbc.update("UPDATE automation_job SET enabled=?,interval_minutes=?,next_run_at=CURRENT_TIMESTAMP WHERE job_key=?",enabled,minutes,key)==0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return list().stream().filter(job->job.key().equals(key)).findFirst().orElseThrow();
    }
    Job run(String key) {
        if(jdbc.update("UPDATE automation_job SET running=TRUE,last_run_at=CURRENT_TIMESTAMP WHERE job_key=? AND (NOT running OR last_run_at<CURRENT_TIMESTAMP-INTERVAL '15 minutes')",key)==0)
            throw new ResponseStatusException(HttpStatus.CONFLICT,"The import is already running or does not exist");
        String result;
        try {
            int refreshed=key.equals("youtube")?importYouTube():importSite(key);
            result=refreshed==0?"No matching published source items. Existing content kept.":"Refreshed "+refreshed+" published source items.";
        } catch(Exception exception) { result="Source unavailable. Existing content kept. Retry on the next scheduled run."; }
        jdbc.update("UPDATE automation_job SET running=FALSE,last_result=?,next_run_at=CURRENT_TIMESTAMP+interval_minutes*INTERVAL '1 minute' WHERE job_key=?",result,key);
        return list().stream().filter(job->job.key().equals(key)).findFirst().orElseThrow();
    }
    void runDue() {
        for(Job job:list()) if(job.enabled()&&(!job.running()||(job.lastRunAt()!=null&&job.lastRunAt().isBefore(Instant.now().minusSeconds(900))))&&!job.nextRunAt().isAfter(Instant.now())) {
            try { run(job.key()); } catch(ResponseStatusException ignored) {}
        }
    }
    private String plain(String html) {
        return HtmlUtils.htmlUnescape(html.replaceAll("(?is)<(script|style)\\b[^>]*>.*?</\\1>","").replaceAll("(?s)<[^>]+>"," ")).replace('\u00a0',' ').replaceAll("\\s+"," ").strip();
    }
    private String text(JsonNode node,String key) { return node.path(key).asText(""); }
    private String category(String terms) {
        if(terms.matches("(?s).*(rashifal|horoscope|राशिफल|ज्योतिष).*")) return "Rashifal";
        if(terms.matches("(?s).*(health|fitness|स्वास्थ्य|फिटनेस|योग).*")) return "Health & Wellness";
        if(terms.matches("(?s).*(books|literature|पुस्तक|साहित्य).*")) return "Books & Literature";
        if(terms.matches("(?s).*(awards|publications|पुरस्कार|प्रकाशन).*")) return "Awards & Publications";
        if(terms.matches("(?s).*(uttarpradesh|uttar pradesh|उत्तरप्रदेश|उत्तर प्रदेश).*")) return "Uttar Pradesh";
        if(terms.matches("(?s).*(sports|खेल|cricket|क्रिकेट).*")) return "Sports";
        if(terms.matches("(?s).*(business|economy|बिजनेस|व्यापार).*")) return "Business";
        if(terms.matches("(?s).*(education|career|शिक्षा|करियर).*")) return "Education";
        if(terms.matches("(?s).*(world|विदेश|अंतरराष्ट्रीय).*")) return "World";
        if(terms.matches("(?s).*(politics|राजनीति).*")) return "Politics";
        if(terms.matches("(?s).*(lifestyle|लाइफस्टाइल).*")) return "Lifestyle";
        return "India";
    }
    private String jobFor(String category) {
        return switch(category) { case "Rashifal"->"rashifal"; case "Health & Wellness"->"health"; case "Books & Literature"->"books"; case "Awards & Publications"->"awards"; default->"news"; };
    }
    private int importSite(String job) {
        JsonNode posts=http.get().uri(java.net.URI.create(SITE_API)).retrieve().body(JsonNode.class);
        if(posts==null||!posts.isArray()) throw new IllegalStateException("No source feed");
        int count=0;
        for(JsonNode post:posts) {
            StringBuilder terms=new StringBuilder();
            for(JsonNode group:post.path("_embedded").path("wp:term")) for(JsonNode term:group) terms.append(' ').append(text(term,"name"));
            String keywords=terms.toString().toLowerCase(Locale.ROOT),category=category(keywords);
            if(!jobFor(category).equals(job)) continue;
            String slug=URLDecoder.decode(text(post,"slug"),StandardCharsets.UTF_8).replaceAll("[^\\p{L}\\p{N}\\p{M}_-]","-");
            if(slug.isBlank()) slug="news-"+post.path("id").asLong();
            String title=plain(post.path("title").path("rendered").asText());
            String summary=plain(post.path("excerpt").path("rendered").asText());
            if(summary.length()>500) summary=summary.substring(0,497)+"…";
            String content=post.path("content").path("rendered").asText();
            List<String> paragraphs=Arrays.stream(content.split("(?i)</p>")).map(this::plain).filter(p->!p.isBlank()).toList();
            if(paragraphs.isEmpty()) paragraphs=List.of(summary.isBlank()?title:summary);
            String image=post.path("_embedded").path("wp:featuredmedia").path(0).path("source_url").asText("");
            var videoMatch=Pattern.compile("https://(?:www\\.)?up24network\\.com/[^\\s\"'<>]+\\.(?:mp4|webm)",Pattern.CASE_INSENSITIVE).matcher(content);
            String video=videoMatch.find()?HtmlUtils.htmlUnescape(videoMatch.group()):null;
            var youtubeMatch=Pattern.compile("(?:youtu\\.be/|youtube(?:-nocookie)?\\.com/(?:embed/|watch\\?v=))([A-Za-z0-9_-]{11})").matcher(content);
            String youtube=youtubeMatch.find()?youtubeMatch.group(1):null;
            String city=keywords.contains("लखनऊ")?"Lucknow":keywords.contains("वाराणसी")?"Varanasi":"Uttar Pradesh";
            Instant published=LocalDateTime.parse(text(post,"date_gmt")).toInstant(ZoneOffset.UTC);
            boolean breaking=keywords.contains("breaking")||keywords.contains("बड़ी खबर");
            if(articles.importPublished(new ArticleDesk.Imported("wordpress:"+post.path("id").asLong(),slug,title,summary,category,city,image,title,video,youtube,paragraphs,published,breaking,text(post,"link")))) count++;
        }
        return count;
    }
    private String xmlText(Element entry,String name) {
        NodeList elements=entry.getElementsByTagNameNS("*",name);
        return elements.getLength()==0?"":elements.item(0).getTextContent();
    }
    private int importYouTube() throws Exception {
        byte[] feed=http.get().uri("https://www.youtube.com/feeds/videos.xml?channel_id="+CHANNEL_ID).retrieve().body(byte[].class);
        var factory=DocumentBuilderFactory.newInstance(); factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities",false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities",false);
        factory.setXIncludeAware(false); factory.setExpandEntityReferences(false);
        Document document=factory.newDocumentBuilder().parse(new ByteArrayInputStream(feed));
        NodeList entries=document.getElementsByTagNameNS("*","entry"); int count=0;
        for(int index=0;index<entries.getLength();index++) {
            Element entry=(Element)entries.item(index);
            String id=xmlText(entry,"videoId"),title=xmlText(entry,"title");
            if(!id.matches("[A-Za-z0-9_-]{11}")) continue;
            if(articles.importPublished(new ArticleDesk.Imported("youtube:"+id,"video-"+id,title,"From the UP24Network YouTube channel.","Videos","UP24Network",
                    "https://i.ytimg.com/vi/"+id+"/hqdefault.jpg",title,null,id,List.of("Watch this report on the official UP24Network YouTube channel."),
                    Instant.parse(xmlText(entry,"published")),false,"https://www.youtube.com/watch?v="+id))) count++;
        }
        return count;
    }
}
