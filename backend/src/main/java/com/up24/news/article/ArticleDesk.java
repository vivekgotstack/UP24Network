package com.up24.news.article;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;

public interface ArticleDesk {
    record Input(@NotBlank @Size(max=500) String title,@NotBlank @Size(max=500) String slug,
                 @NotBlank @Size(max=2000) String summary,@NotBlank @Size(max=100) String category,
                 @Size(max=100) String city,@Size(max=2000) String image,@Size(max=500) String imageAlt,
                 @Size(max=2000) String videoUrl,@Pattern(regexp="^$|^[A-Za-z0-9_-]{11}$") String youtubeId,
                 @NotBlank @Size(max=100000) String body) {}
    record Managed(UUID id,UUID authorId,String status,boolean manualOverride,ArticleView article) {}
    record Imported(String upstreamKey,String slug,String title,String summary,String category,String city,
                    String image,String imageAlt,String videoUrl,String youtubeId,List<String> paragraphs,
                    Instant publishedAt,boolean breaking,String sourceUrl) {}
    List<Managed> list();
    Optional<Managed> find(UUID id);
    Managed save(UUID id,Input input,UUID actor,String author);
    Managed publish(UUID id,boolean published,boolean breaking);
    List<ArticleView> published();
    boolean importPublished(Imported article);
}
