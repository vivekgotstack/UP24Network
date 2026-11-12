package com.up24.news.automation.internal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.up24.news.horoscope.HoroscopeEdition;
import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import static org.assertj.core.api.Assertions.*;

class ProviderContractTest {
    private final ObjectMapper json = new ObjectMapper();
    private final LocalDate date = LocalDate.of(2026, 11, 12);
    private final Instant now = Instant.parse("2026-11-12T05:00:00Z");

    private ObjectNode edition() {
        var root = json.createObjectNode();
        root.putObject("meta").put("mode", "live");
        var data = root.putObject("data").put("period", "daily").put("date", date.toString());
        var signs = data.putArray("signs");
        for (String id : HoroscopeEdition.SIGN_IDS) {
            var sign = signs.addObject().put("sign", id).put("period", "daily").put("date", date.toString());
            var hindi = sign.putObject("hindi").put("name", "राशि").put("reading", "आज का परीक्षण पाठ।");
            hindi.putObject("lucky").put("number", "1").put("color", "नीला");
        }
        return root;
    }

    @Test void acceptsACompleteHindiEditionAndUsesTheIndianCalendarBoundary() {
        assertThat(HindiHoroscopeSource.decode(edition(), date, now).signs()).hasSize(12);
        assertThat(LocalDate.ofInstant(Instant.parse("2026-11-11T18:31:00Z"), HoroscopeEdition.EDITION_ZONE)).isEqualTo(date);
    }

    @Test void rejectsStalePartialAndDuplicateEditions() {
        var stale = edition(); stale.withObject("/data").put("date", "2026-11-11");
        var partial = edition(); partial.withArray("/data/signs").remove(11);
        var duplicate = edition(); ((ObjectNode) duplicate.at("/data/signs/11")).put("sign", "aries");
        for (var invalid : new ObjectNode[]{stale, partial, duplicate}) {
            assertThatThrownBy(() -> HindiHoroscopeSource.decode(invalid, date, now)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test void rejectsTestModeAndEnglishFallback() {
        var test = edition(); test.withObject("/meta").put("mode", "test");
        var english = edition(); english.withObject("/data/signs/0/hindi").put("reading", "English fallback");
        assertThatThrownBy(() -> HindiHoroscopeSource.decode(test, date, now)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> HindiHoroscopeSource.decode(english, date, now)).isInstanceOf(IllegalArgumentException.class);
    }

    private String feed(String channel, String thumbnail) {
        return """
                <feed xmlns="http://www.w3.org/2005/Atom" xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
                <yt:channelId>%s</yt:channelId><author><uri>https://www.youtube.com/channel/%s</uri></author>
                <entry><yt:videoId>abcdefghijk</yt:videoId><yt:channelId>%s</yt:channelId>
                <title>नई रिपोर्ट</title><published>2026-11-11T05:00:00Z</published>
                <media:group><media:thumbnail url="%s" /></media:group></entry></feed>
                """.formatted(channel.startsWith("UC") ? channel.substring(2) : channel, channel, channel, thumbnail);
    }

    @Test void preservesTheExactThumbnailReturnedByTheChannel() {
        String thumbnail = "https://i3.ytimg.com/vi/abcdefghijk/hqdefault.jpg";
        var reports = YouTubeSource.decode(feed(YouTubeSource.CHANNEL_ID, thumbnail).getBytes(StandardCharsets.UTF_8));
        assertThat(reports).singleElement().satisfies(report -> assertThat(report.image()).isEqualTo(thumbnail));
    }

    @Test void rejectsUnapprovedChannelsImagesAndExternalEntities() {
        String valid = feed(YouTubeSource.CHANNEL_ID, "https://i3.ytimg.com/vi/abcdefghijk/hqdefault.jpg");
        for (String invalid : new String[]{valid.replace(YouTubeSource.CHANNEL_ID, "other-channel"), valid.replace("i3.ytimg.com", "untrusted.example"),
                "<!DOCTYPE feed [<!ENTITY xxe SYSTEM 'file:///secret'>]>" + valid}) {
            assertThatThrownBy(() -> YouTubeSource.decode(invalid.getBytes(StandardCharsets.UTF_8))).isInstanceOf(IllegalArgumentException.class);
        }
    }
}
