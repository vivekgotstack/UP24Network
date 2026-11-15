package com.up24.news.media.internal;

import com.up24.news.media.VideoSuggestions;

interface VideoMetadataClient {
    VideoSuggestions.Video fetch(String id);
}
