package com.up24.news.article.internal;

import com.up24.news.PublicationBrand;
import com.up24.news.article.ArticleDesk;
import com.up24.news.article.ArticleView;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Stream;

final class ArticleFieldPolicy {
    private static final Pattern INSTAGRAM_REEL_PATH = Pattern.compile("/reel/([A-Za-z0-9_-]{1,64})/?");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+", Pattern.UNICODE_CHARACTER_CLASS);
    private ArticleFieldPolicy() {}

    static String slug(String input) {
        String slug = input.trim().toLowerCase(Locale.ROOT);
        if (!slug.matches("[\\p{L}\\p{N}\\p{M}_-]+")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use letters, numbers and hyphens in the slug");
        }
        return slug;
    }

    static String verifyProposal(ArticleDesk.Input input) {
        slug(input.slug());
        media(input.image(), "image");
        media(input.videoUrl(), "video");
        if (Stream.of(input.title(), input.summary(), input.category(), input.city(), input.imageAlt(),
                input.body(), input.sourceNotes()).anyMatch(text -> text != null && text.indexOf('\0') >= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Remove invalid control characters from the article.");
        }
        english(input.english());
        return reel(input);
    }

    static ArticleView.English english(ArticleDesk.EnglishInput input) {
        if (input == null || Stream.of(input.title(), input.summary(), input.body(), input.imageAlt()).noneMatch(ArticleFieldPolicy::present)) {
            return null;
        }
        if (!present(input.title()) || !present(input.summary()) || !present(input.body())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Complete the English headline, summary, and report together.");
        }
        if (Stream.of(input.title(), input.summary(), input.body(), input.imageAlt())
                .anyMatch(text -> text != null && text.indexOf('\0') >= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Remove invalid control characters from the English translation.");
        }
        return new ArticleView.English(input.title().strip(), input.summary().strip(), paragraphs(input.body()),
                present(input.imageAlt()) ? input.imageAlt().strip() : null);
    }

    static List<String> paragraphs(String body) {
        return Arrays.stream(body.split("\\n\\s*\\n")).map(String::strip).filter(text -> !text.isBlank()).toList();
    }

    static List<String> tags(List<String> input) {
        if (input == null) return List.of();
        var tags = new LinkedHashMap<String, String>();
        for (String label : input) {
            if (label == null || label.codePoints().anyMatch(Character::isISOControl)) rejectTag();
            String tag = WHITESPACE.matcher(Normalizer.normalize(label, Normalizer.Form.NFKC)).replaceAll(" ").strip();
            if (tag.length() > 60 || tag.codePoints().noneMatch(Character::isLetterOrDigit)) rejectTag();
            tags.putIfAbsent(tag.toLowerCase(Locale.ROOT), tag);
        }
        if (tags.size() > 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add no more than eight topic tags.");
        }
        return List.copyOf(tags.values());
    }

    static String mediaCredit(String input) {
        if (input == null) return null;
        String credit = input.strip();
        if (credit.length() > 240 || credit.codePoints().anyMatch(Character::isISOControl)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a single line of up to 240 characters for the media credit.");
        }
        return credit;
    }

    private static void rejectTag() {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each topic tag must contain letters or numbers and be at most 60 characters.");
    }

    static String reel(ArticleDesk.Input input) {
        String text = input.reelUrl() == null ? "" : input.reelUrl().strip();
        if (!ArticleDesk.TRENDING_REELS.equals(input.category())) {
            if (text.isEmpty()) return null;
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select Trending Reels to add an Instagram Reel.");
        }
        if (present(input.videoUrl()) || present(input.youtubeId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use one Instagram Reel as the video source for this entry.");
        }
        try {
            URI url = URI.create(text);
            String host = url.getHost();
            if ("https".equalsIgnoreCase(url.getScheme()) && host != null
                    && Set.of("instagram.com", "www.instagram.com").contains(host.toLowerCase(Locale.ROOT))
                    && url.getRawUserInfo() == null && url.getPort() == -1) {
                var path = INSTAGRAM_REEL_PATH.matcher(url.getRawPath());
                if (path.matches()) return "https://www.instagram.com/reel/" + path.group(1) + "/";
            }
        } catch (IllegalArgumentException ignored) {
            // A malformed link is handled by the same validation response as an unsupported link.
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add an HTTPS link to a public Instagram Reel.");
    }

    private static boolean present(String value) { return value != null && !value.isBlank(); }

    static String media(String input, String kind) {
        String text = input == null ? "" : input.trim();
        if (text.isBlank()) return kind.equals("image") ? PublicationBrand.LOGO : null;
        if (kind.equals("image") && Set.of("/brand/up24-logo.png", "/brand/newsroom-banner.png").contains(text)) {
            return PublicationBrand.LOGO;
        }
        boolean local = (text.matches("^/(images|brand|videos)/[A-Za-z0-9._/-]+$") && !text.contains(".."))
                || (kind.equals("image") && text.matches("^/media/[a-f0-9]{64}\\.webp$"))
                || (kind.equals("video") && text.matches("^/media/videos/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.mp4$"));
        try {
            URI uri = URI.create(text);
            if (local || ("https".equals(uri.getScheme()) && uri.getRawUserInfo() == null
                    && (Set.of("up24network.com", "www.up24network.com").contains(uri.getHost())
                    || (kind.equals("image") && Set.of("i.ytimg.com", "i1.ytimg.com", "i2.ytimg.com", "i3.ytimg.com", "i4.ytimg.com").contains(uri.getHost()))))) {
                return text;
            }
        } catch (IllegalArgumentException ignored) {}
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a local asset or an approved HTTPS media URL.");
    }
}
