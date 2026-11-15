package com.up24.news.media.internal;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Component
class YouTubeMetadataClient implements VideoMetadataClient {
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).followRedirects(HttpClient.Redirect.NEVER).build();
    private final ObjectMapper json;
    YouTubeMetadataClient(ObjectMapper json) { this.json=json; }
    @Override public com.up24.news.media.VideoSuggestions.Video fetch(String id) {
        var uri=URI.create("https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v="+id+"&format=json");
        var future=http.sendAsync(HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(5)).header("Accept","application/json").GET().build(),HttpResponse.BodyHandlers.ofByteArray());
        try {
            var response=future.get(6,TimeUnit.SECONDS);
            if (response.statusCode()!=200 || response.body().length>32768) throw new MediaProblem(MediaProblem.Reason.INVALID,"Video details are unavailable. Enter the report details manually.");
            var data=json.readTree(response.body());
            return new com.up24.news.media.VideoSuggestions.Video(data.path("title").asText(""),data.path("author_name").asText(""),
                    "https://i.ytimg.com/vi/"+id+"/hqdefault.jpg",id,"https://www.youtube.com/watch?v="+id);
        } catch(InterruptedException exception) {
            Thread.currentThread().interrupt(); throw new MediaProblem(MediaProblem.Reason.STORAGE,"The source request was interrupted.");
        } catch(Exception exception) {
            future.cancel(true);
            if(exception instanceof MediaProblem problem) throw problem;
            throw new MediaProblem(MediaProblem.Reason.STORAGE,"The video source is temporarily unavailable. You can continue entering the report manually.");
        }
    }
}
