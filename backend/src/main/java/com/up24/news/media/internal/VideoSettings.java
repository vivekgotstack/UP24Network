package com.up24.news.media.internal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.nio.file.Path;

@Component
class VideoSettings {
    final Path directory;
    final long quotaBytes;
    final long maxUploadBytes;
    final String ffmpeg;
    final String ffprobe;
    VideoSettings(@Value("${up24.media.directory}") String directory,
            @Value("${up24.video.quota-bytes:${UP24_VIDEO_QUOTA_BYTES:53687091200}}") long quotaBytes,
            @Value("${up24.video.max-upload-bytes:${UP24_VIDEO_MAX_UPLOAD_BYTES:262144000}}") long maxUploadBytes,
            @Value("${up24.video.ffmpeg:${UP24_VIDEO_FFMPEG:ffmpeg}}") String ffmpeg,
            @Value("${up24.video.ffprobe:${UP24_VIDEO_FFPROBE:ffprobe}}") String ffprobe) {
        if(quotaBytes<1 || maxUploadBytes<1 || maxUploadBytes>262144000) throw new IllegalStateException("Set a positive video quota and an upload limit up to 250 MiB.");
        this.directory=Path.of(directory).toAbsolutePath().normalize();this.quotaBytes=quotaBytes;this.maxUploadBytes=maxUploadBytes;
        this.ffmpeg=ffmpeg;this.ffprobe=ffprobe;
    }
    Path work(java.util.UUID id) { return directory.resolve(".video-work").resolve(id.toString()); }
    Path source(java.util.UUID id) { return work(id).resolve("original.mp4"); }
    Path encoded(java.util.UUID id,java.util.UUID token) { return work(id).resolve("encoded-"+token+".mp4"); }
}
