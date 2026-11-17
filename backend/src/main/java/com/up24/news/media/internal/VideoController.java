package com.up24.news.media.internal;

import com.up24.news.identity.Access;
import com.up24.news.identity.Accounts;
import com.up24.news.media.MediaVideos;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.WebRequest;
import java.io.IOException;
import java.nio.file.Files;
import java.time.Duration;
import java.util.UUID;

@RestController
class VideoController {
    record NewVideo(@NotBlank @Size(max=255) String name,@Min(12) @Max(262144000) long bytes) {}
    record Version(@PositiveOrZero long version) {}
    private final MediaVideos videos;
    private final VideoService delivery;
    private final Access access;
    VideoController(MediaVideos videos,VideoService delivery,Access access) { this.videos=videos;this.delivery=delivery;this.access=access; }
    private boolean privileged() { return access.current().role()!=Accounts.Role.REPORTER; }
    @GetMapping("/api/admin/videos") @PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')")
    MediaVideos.Page list(@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="12") int size) { return videos.list(access.current().id(),privileged(),page,size); }
    @PostMapping("/api/admin/videos/tickets") @PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')")
    MediaVideos.Ticket ticket(@Valid @RequestBody NewVideo input) { return videos.ticket(input.name(),input.bytes(),access.current().id()); }
    @PutMapping(value="/api/admin/videos/{id}/source",consumes=MediaType.APPLICATION_OCTET_STREAM_VALUE)
    @PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')") @ResponseStatus(HttpStatus.NO_CONTENT)
    void source(@PathVariable UUID id,HttpServletRequest request) throws IOException { delivery.receive(id,access.current().id(),privileged(),request.getInputStream(),request.getContentLengthLong()); }
    @PostMapping("/api/admin/videos/{id}/complete") @PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')")
    MediaVideos.Video complete(@PathVariable UUID id) { return videos.complete(id,access.current().id(),privileged()); }
    @PostMapping("/api/admin/videos/{id}/retry") @PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')")
    MediaVideos.Video retry(@PathVariable UUID id,@Valid @RequestBody Version input) { return videos.retry(id,input.version(),access.current().id(),privileged()); }
    @GetMapping("/api/admin/videos/{id}") @PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')")
    MediaVideos.Video get(@PathVariable UUID id) { return videos.get(id,access.current().id(),privileged()); }
    @DeleteMapping("/api/admin/videos/{id}") @PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')") @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(@PathVariable UUID id) { delivery.cancel(id,access.current().id(),access.current().role()==Accounts.Role.ADMIN); }
    @GetMapping("/media/videos/{id}.mp4") ResponseEntity<Resource> stream(@PathVariable UUID id,WebRequest request) throws IOException {
        var video=delivery.publicVideo(id);var source=delivery.delivery(id);
        if(source.redirect()!=null) return ResponseEntity.status(HttpStatus.TEMPORARY_REDIRECT).location(source.redirect())
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic()).build();
        if(!Files.isRegularFile(source.file())) return ResponseEntity.notFound().build();
        String etag="\""+video.view().id()+"-"+video.view().version()+"\"";
        var cache=CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable();
        if(request.checkNotModified(etag)) return ResponseEntity.status(HttpStatus.NOT_MODIFIED).eTag(etag).cacheControl(cache).build();
        return ResponseEntity.ok().contentType(MediaType.valueOf("video/mp4")).eTag(etag).cacheControl(cache)
                .contentLength(video.view().storedBytes()).body(new FileSystemResource(source.file()));
    }
}
