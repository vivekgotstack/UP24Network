package com.up24.news.media.internal;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.up24.news.media.VideoSuggestions;
import org.springframework.stereotype.Service;
import java.time.Duration;

@Service
class VideoSuggestionService implements VideoSuggestions {
    private final VideoMetadataClient metadata;
    private final Cache<String,Video> cache=Caffeine.newBuilder().maximumSize(128).expireAfterWrite(Duration.ofHours(1)).build();
    VideoSuggestionService(VideoMetadataClient metadata) { this.metadata=metadata; }
    @Override public Video youtube(String id) {
        if(id==null || !id.matches("[A-Za-z0-9_-]{11}")) throw new MediaProblem(MediaProblem.Reason.INVALID,"Enter a valid YouTube video address.");
        return cache.get(id,metadata::fetch);
    }
}
