package com.up24.news.media.internal;

import com.up24.news.identity.Access;
import com.up24.news.media.MediaLibrary;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.nio.file.Files;
import java.time.Duration;

@RestController
class MediaController {
    private final MediaLibrary media;
    private final BinaryStorage storage;
    private final Access access;
    MediaController(MediaLibrary media,BinaryStorage storage,Access access) { this.media=media; this.storage=storage; this.access=access; }
    @GetMapping("/api/admin/media") @PreAuthorize("@access.hasAny('ADMIN')")
    MediaLibrary.Page list(@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="24") int size) { return media.list(page,size); }
    @PostMapping(value="/api/admin/media",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("@access.hasAny('ADMIN','EDITOR','REPORTER')")
    MediaLibrary.Asset upload(@RequestPart MultipartFile file,@RequestParam int originalBytes) throws IOException {
        return media.upload(file.getOriginalFilename(),file.getBytes(),originalBytes,access.current().id());
    }
    @DeleteMapping("/api/admin/media/{id}") @PreAuthorize("@access.hasAny('ADMIN')") @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(@PathVariable String id) { media.remove(id); }
    @GetMapping("/media/{id:[a-f0-9]{64}}.webp")
    ResponseEntity<FileSystemResource> image(@PathVariable String id) {
        var asset=media.find(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var path=storage.path(id);
        if (!Files.isRegularFile(path)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("image/webp"))
                .contentLength(asset.bytes()).cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .body(new FileSystemResource(path));
    }
    @ExceptionHandler(MediaProblem.class) ProblemDetail problem(MediaProblem exception) {
        var status=switch(exception.reason) { case INVALID -> HttpStatus.BAD_REQUEST; case MISSING -> HttpStatus.NOT_FOUND;
            case IN_USE -> HttpStatus.CONFLICT; case STORAGE -> HttpStatus.SERVICE_UNAVAILABLE; };
        return ProblemDetail.forStatusAndDetail(status,exception.getMessage());
    }
}
