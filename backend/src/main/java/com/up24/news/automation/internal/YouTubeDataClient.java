package com.up24.news.automation.internal;

import com.up24.news.PublicationBrand;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.article.ArticleDesk;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.net.URI;
import java.time.Instant;
import java.util.*;

/** Optional keyed adapter; the approved channel remains fixed server-side. */
@Component
class YouTubeDataClient {
    private final RestClient client;
    private final ObjectMapper json;
    private final String key;
    private volatile String uploads;
    YouTubeDataClient(RestClient.Builder builder,ObjectMapper json,@Value("${up24.providers.youtube.api-key:}") String key) {
        this.client=SourceClients.create(builder,"https://www.googleapis.com/youtube/v3");this.json=json;this.key=key;
    }
    boolean configured() { return !key.isBlank(); }
    private JsonNode read(String path,Map<String,String> parameters) {
        try {
            return client.get().uri(uri->{var value=uri.path(path);parameters.forEach(value::queryParam);return value.build();})
                    .header("X-Goog-Api-Key",key).exchange((request,response)->{
                        if(!response.getStatusCode().is2xxSuccessful()) throw new IllegalStateException("The YouTube source is temporarily unavailable.");
                        byte[] body=response.getBody().readNBytes(2_000_001);
                        if(body.length>2_000_000) throw new IllegalStateException("The YouTube response exceeded its limit.");
                        return json.readTree(body);
                    });
        } catch(RuntimeException exception) { throw new IllegalStateException("The YouTube source could not be retrieved."); }
    }
    List<ArticleDesk.Imported> prepare() {
        if(!configured()) throw new IllegalStateException("Configure the YouTube Data API key.");
        if(uploads==null) {
            var items=read("/channels",Map.of("part","contentDetails","id",YouTubeSource.CHANNEL_ID)).path("items");
            if(items.size()!=1 || !YouTubeSource.CHANNEL_ID.equals(items.path(0).path("id").asText())) throw new IllegalStateException("The approved channel could not be verified.");
            String playlist=items.path(0).path("contentDetails").path("relatedPlaylists").path("uploads").asText();
            if(!playlist.matches("[A-Za-z0-9_-]{12,64}")) throw new IllegalStateException("The channel uploads playlist is invalid.");
            uploads=playlist;
        }
        return decode(read("/playlistItems",Map.of("part","snippet,contentDetails","playlistId",uploads,"maxResults","50")));
    }
    static List<ArticleDesk.Imported> decode(JsonNode root) {
        var items=root.path("items");
        if(!items.isArray() || items.size()>50) throw new IllegalArgumentException("Invalid YouTube video response.");
        var result=new ArrayList<ArticleDesk.Imported>();var seen=new HashSet<String>();
        for(var item:items) {
            var snippet=item.path("snippet");String id=item.path("contentDetails").path("videoId").asText();
            if(!id.matches("[A-Za-z0-9_-]{11}") || !seen.add(id)) throw new IllegalArgumentException("Invalid video identifier.");
            String owner=snippet.path("videoOwnerChannelId").asText(snippet.path("channelId").asText());
            if(!YouTubeSource.CHANNEL_ID.equals(owner)) throw new IllegalArgumentException("Unexpected video owner.");
            String title=snippet.path("title").asText().strip();
            var thumbnails=snippet.path("thumbnails");String image="";
            for(String size:List.of("maxres","standard","high","medium","default")) {
                image=thumbnails.path(size).path("url").asText();if(!image.isBlank()) break;
            }
            // Deleted/private playlist entries are not newly published as reports.
            if(image.isBlank() || title.equals("Deleted video") || title.equals("Private video")) continue;
            URI thumbnail=URI.create(image);
            if(title.isBlank() || title.length()>500 || !"https".equals(thumbnail.getScheme()) || thumbnail.getUserInfo()!=null
                    || !Set.of("i.ytimg.com","i1.ytimg.com","i2.ytimg.com","i3.ytimg.com","i4.ytimg.com").contains(thumbnail.getHost())
                    || !thumbnail.getPath().startsWith("/vi/"+id+"/")) throw new IllegalArgumentException("Invalid source metadata.");
            String description=snippet.path("description").asText().strip();
            if(description.length()>10000) throw new IllegalArgumentException("Source description exceeds its limit.");
            String summary=description.isBlank()?PublicationBrand.NAME + " की आधिकारिक वीडियो रिपोर्ट।":description.substring(0,Math.min(1800,description.length()));
            var paragraphs=description.isBlank()?List.of("पूरी रिपोर्ट वीडियो में देखें।"):Arrays.stream(description.split("\\n\\s*\\n")).map(String::strip).filter(value->!value.isBlank()).toList();
            result.add(new ArticleDesk.Imported("youtube:"+id,"video-"+id,title,summary,"Videos",PublicationBrand.NAME,image,title,null,id,
                    paragraphs,Instant.parse(item.path("contentDetails").path("videoPublishedAt").asText()),false,"https://www.youtube.com/watch?v="+id,""));
        }
        return List.copyOf(result);
    }
}
