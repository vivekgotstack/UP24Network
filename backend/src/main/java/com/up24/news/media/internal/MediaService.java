package com.up24.news.media.internal;

import com.up24.news.article.ArticleMediaUsage;
import com.up24.news.media.MediaLibrary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
class MediaService implements MediaLibrary {
    private final MediaStore media;
    private final BinaryStorage storage;
    private final ArticleMediaUsage usage;
    private final Clock clock;
    private final long quotaBytes;
    private final UnusedMediaCleanup cleanup;
    MediaService(MediaStore media,BinaryStorage storage,ArticleMediaUsage usage,Clock clock,
                 @Value("${up24.media.quota-bytes}") long quotaBytes,UnusedMediaCleanup cleanup) {
        this.media=media; this.storage=storage; this.usage=usage; this.clock=clock;
        if(quotaBytes<1) throw new IllegalArgumentException("The media storage allowance must be positive.");
        this.quotaBytes=quotaBytes;this.cleanup=cleanup;
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    @Override public Page list(int page,int size) {
        var stored=media.list(Math.max(1,page),Math.clamp(size,1,50));
        return new Page(stored.items(),stored.total(),stored.page(),stored.size(),stored.pages(),stored.storedBytes(),quotaBytes);
    }
    @Override public Optional<Asset> find(String id) { return id.matches("[a-f0-9]{64}")?media.find(id):Optional.empty(); }
    @Transactional @Override public Asset upload(String name,byte[] bytes,int originalBytes,UUID actor) {
        if (bytes.length==0 || bytes.length>2*1024*1024 || originalBytes<1 || originalBytes>12*1024*1024)
            throw new MediaProblem(MediaProblem.Reason.INVALID,"Upload a photograph of at most 12 MB; its optimized copy must fit within 2 MB.");
        try(var input=new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers=ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new MediaProblem(MediaProblem.Reason.INVALID,"The image is not a supported WebP photograph.");
            var reader=readers.next();
            try {
                reader.setInput(input);
                if (!reader.getFormatName().equalsIgnoreCase("webp")) throw new MediaProblem(MediaProblem.Reason.INVALID,"Use an optimized WebP photograph.");
                int width=reader.getWidth(0),height=reader.getHeight(0);
                if (width<1 || height<1 || width>1920 || height>1920) throw new MediaProblem(MediaProblem.Reason.INVALID,"The optimized image exceeds 1920 pixels.");
                reader.read(0); // Decode the bounded image before accepting it into public storage.
                String id=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
                String safeName=(name==null?"Photograph":name).replaceAll("[\\p{Cntrl}\\\\/]","_").strip();
                if(safeName.isEmpty()) safeName="Photograph";
                safeName=safeName.substring(0,Math.min(255,safeName.length()));
                var asset=new Asset(id,"/media/"+id+".webp",safeName,bytes.length,originalBytes,width,height,clock.instant());
                var location=storage.target(id);
                var reservation=media.reserve(asset,actor,quotaBytes,location);
                if(reservation.inserted()) storage.put(location,bytes);
                return reservation.asset();
            } finally { reader.dispose(); }
        } catch(IOException exception) { throw new MediaProblem(MediaProblem.Reason.STORAGE,"The image could not be stored. Try again."); }
        catch(NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }
    @Transactional @Override public void remove(String id) {
        media.lockQuota();
        var asset=find(id).orElseThrow(() -> new MediaProblem(MediaProblem.Reason.MISSING,"Image not found."));
        if (usage.inUse(asset.url())) throw new MediaProblem(MediaProblem.Reason.IN_USE,"This image is used by an article or a retained revision. Remove those references first.");
        try { media.delete(id); }
        catch(DataIntegrityViolationException exception) { throw new MediaProblem(MediaProblem.Reason.IN_USE,"An article is using this image."); }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                cleanup.removeIfUnreferenced(id);
            }
        });
    }
}
