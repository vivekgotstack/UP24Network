package com.up24.news.automation.internal;

import com.up24.news.article.ArticleDesk;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.w3c.dom.Element;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
class YouTubeSource implements AutomationSource {
    static final String CHANNEL_ID = "UC5Gu1A0d70QSUThd_7VrPew";
    private final RestClient http;
    private final ArticleDesk articles;

    YouTubeSource(RestClient.Builder builder, ArticleDesk articles) {
        this.http = SourceClients.create(builder, "https://www.youtube.com");
        this.articles = articles;
    }

    @Override public String key() { return "youtube"; }
    @Override public Status status() { return new Status(true, "Official UP24Network channel feed. Thumbnails update with the feed."); }

    @Override public Prepared prepare() {
        byte[] feed = http.get().uri("/feeds/videos.xml?channel_id=" + CHANNEL_ID).retrieve().body(byte[].class);
        List<ArticleDesk.Imported> reports = decode(feed);
        return () -> (int) reports.stream().filter(articles::importPublished).count();
    }

    static List<ArticleDesk.Imported> decode(byte[] feed) {
        if (feed == null || feed.length == 0 || feed.length > 2_000_000) throw new IllegalArgumentException("Invalid channel feed");
        try {
            var factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            var document = factory.newDocumentBuilder().parse(new ByteArrayInputStream(feed));
            Element root = document.getDocumentElement();
            String channel = text(root, "channelId");
            if (!"feed".equals(root.getLocalName()) || !(CHANNEL_ID.equals(channel) || CHANNEL_ID.substring(2).equals(channel))
                    || !text(root, "uri").equals("https://www.youtube.com/channel/" + CHANNEL_ID)) {
                throw new IllegalArgumentException("The feed is not from the approved channel");
            }
            var entries = root.getElementsByTagNameNS("*", "entry");
            if (entries.getLength() > 50) throw new IllegalArgumentException("Unexpected feed size");
            var reports = new ArrayList<ArticleDesk.Imported>();
            var ids = new HashSet<String>();
            for (int index = 0; index < entries.getLength(); index++) {
                Element entry = (Element) entries.item(index);
                String id = text(entry, "videoId"), title = text(entry, "title").strip();
                if (!id.matches("[A-Za-z0-9_-]{11}") || !ids.add(id) || title.isBlank() || title.length() > 500
                        || !CHANNEL_ID.equals(text(entry, "channelId"))) throw new IllegalArgumentException("Invalid video entry");
                var thumbnails = entry.getElementsByTagNameNS("http://search.yahoo.com/mrss/", "thumbnail");
                if (thumbnails.getLength() == 0) throw new IllegalArgumentException("The source thumbnail is missing");
                String thumbnail = ((Element) thumbnails.item(0)).getAttribute("url");
                URI image = URI.create(thumbnail);
                if (!"https".equals(image.getScheme()) || !Set.of("i.ytimg.com", "i1.ytimg.com", "i2.ytimg.com", "i3.ytimg.com", "i4.ytimg.com").contains(image.getHost())
                        || !image.getPath().startsWith("/vi/" + id + "/") || image.getRawUserInfo() != null) {
                    throw new IllegalArgumentException("Unexpected video thumbnail host or path");
                }
                reports.add(new ArticleDesk.Imported("youtube:" + id, "video-" + id, title,
                        "From the UP24Network YouTube channel.", "Videos", "UP24Network", thumbnail, title, null, id,
                        List.of("Watch this report on the official UP24Network YouTube channel."),
                        Instant.parse(text(entry, "published")), false, "https://www.youtube.com/watch?v=" + id, ""));
            }
            return List.copyOf(reports);
        } catch (Exception exception) {
            throw new IllegalArgumentException("The channel feed could not be validated", exception);
        }
    }

    private static String text(Element element, String localName) {
        var matches = element.getElementsByTagNameNS("*", localName);
        return matches.getLength() == 0 ? "" : matches.item(0).getTextContent();
    }
}
