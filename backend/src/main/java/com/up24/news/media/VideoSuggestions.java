package com.up24.news.media;

public interface VideoSuggestions {
    record Video(String title,String author,String thumbnail,String youtubeId,String url) {}
    Video youtube(String videoId);
}
