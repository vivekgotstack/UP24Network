package com.up24.news.article.internal;

import com.up24.news.article.ArticleDesk;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Stream;

final class ArticleFieldPolicy {
    private ArticleFieldPolicy() {}

    static String slug(String input) {
        String slug = input.trim().toLowerCase(Locale.ROOT);
        if (!slug.matches("[\\p{L}\\p{N}\\p{M}_-]+")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use letters, numbers and hyphens in the slug");
        }
        return slug;
    }

    static void verifyProposal(ArticleDesk.Input input) {
        slug(input.slug());
        media(input.image(), "image");
        media(input.videoUrl(), "video");
        if (Stream.of(input.title(), input.summary(), input.category(), input.city(), input.imageAlt(),
                input.body(), input.sourceNotes()).anyMatch(text -> text != null && text.indexOf('\0') >= 0)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Remove invalid control characters from the article.");
        }
    }

    static String media(String input, String kind) {
        String text = input == null ? "" : input.trim();
        if (text.isBlank()) return kind.equals("image") ? "/brand/up24-logo.png" : null;
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
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a local asset or an HTTPS media URL from UP24Network");
    }
}
