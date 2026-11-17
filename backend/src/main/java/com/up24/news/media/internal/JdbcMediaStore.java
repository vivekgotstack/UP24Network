package com.up24.news.media.internal;

import com.up24.news.media.MediaLibrary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;
import java.util.List;
import java.sql.Timestamp;
import java.time.Instant;

@Repository
class JdbcMediaStore implements MediaStore {
    private static final RowMapper<MediaLibrary.Asset> ASSET=(row,index) -> new MediaLibrary.Asset(row.getString("id"),
            "/media/"+row.getString("id")+".webp",row.getString("original_name"),row.getInt("bytes"),row.getInt("original_bytes"),
            row.getInt("width"),row.getInt("height"),row.getTimestamp("created_at").toInstant(),
            row.getString("storage_backend"),row.getBoolean("archive_eligible"),row.getLong("version"),
            row.getString("storage_backend").equals("S3") && row.getLong("retention_applied_version")!=row.getLong("version"));
    private static final RowMapper<Deletion> DELETION=(row,index) -> new Deletion(row.getString("asset_id"),
            new StorageLocation(row.getString("storage_backend"),row.getString("storage_bucket"),row.getString("object_key")));
    private final JdbcTemplate jdbc;
    JdbcMediaStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Override public Optional<MediaLibrary.Asset> find(String id) {
        return jdbc.query("SELECT * FROM media_asset WHERE id=?",ASSET,id).stream().findFirst();
    }
    @Override public MediaLibrary.Page list(int page,int size) {
        long total=jdbc.queryForObject("SELECT count(*) FROM media_asset",Long.class);
        long bytes=usedBytes();
        int pages=Math.max(1,(int)Math.ceil((double)total/size));
        int current=Math.min(page,pages);
        return new MediaLibrary.Page(jdbc.query("SELECT * FROM media_asset ORDER BY created_at DESC,id LIMIT ? OFFSET ?",ASSET,size,(current-1)*size),total,current,size,pages,bytes);
    }
    @Override public void lockQuota() {
        jdbc.execute("SELECT pg_advisory_xact_lock(8524,1301)");
    }
    @Override public long usedBytes() {
        return jdbc.queryForObject("SELECT (SELECT COALESCE(sum(bytes),0) FROM media_asset)+(SELECT COALESCE(sum(bytes),0) FROM media_pending_deletion)+(SELECT COALESCE(sum(bytes),0) FROM media_copy_reservation)",Long.class);
    }
    @Override public Optional<StorageLocation> location(String id) {
        return jdbc.query("SELECT storage_backend,storage_bucket,object_key FROM media_asset WHERE id=?",
                (row,index) -> new StorageLocation(row.getString(1),row.getString(2),row.getString(3)),id).stream().findFirst();
    }
    @Override public Reservation reserve(MediaLibrary.Asset asset,UUID actor,long quotaBytes,StorageLocation location) {
        lockQuota();
        var existing=find(asset.id());
        if(existing.isPresent()) return new Reservation(existing.get(),false);
        completedDeletion(new Deletion(asset.id(),location));
        long storedBytes=usedBytes();
        if(asset.bytes()>quotaBytes || storedBytes>quotaBytes-asset.bytes())
            throw new MediaProblem(MediaProblem.Reason.QUOTA,"The media storage allowance is full. Remove unused photographs or increase the server storage allowance before uploading new images.");
        jdbc.update("INSERT INTO media_asset(id,original_name,bytes,original_bytes,width,height,uploaded_by,storage_backend,storage_bucket,object_key) VALUES (?,?,?,?,?,?,?,?,?,?)",
                asset.id(),asset.name(),asset.bytes(),asset.originalBytes(),asset.width(),asset.height(),actor,location.backend(),location.bucket(),location.key());
        return new Reservation(find(asset.id()).orElseThrow(),true);
    }
    @Override public void delete(String id) {
        jdbc.update("INSERT INTO media_pending_deletion(asset_id,storage_backend,storage_bucket,object_key,bytes) SELECT id,storage_backend,storage_bucket,object_key,bytes FROM media_asset WHERE id=? ON CONFLICT DO NOTHING",id);
        jdbc.update("DELETE FROM media_asset WHERE id=?",id);
    }
    @Override public List<Deletion> deletions(String id) {
        return jdbc.query("SELECT * FROM media_pending_deletion WHERE asset_id=?",DELETION,id);
    }
    @Override public List<Deletion> dueDeletions() {
        return jdbc.query("SELECT * FROM media_pending_deletion WHERE next_attempt_at<=CURRENT_TIMESTAMP ORDER BY next_attempt_at LIMIT 10",DELETION);
    }
    @Override public void completedDeletion(Deletion deletion) {
        var location=deletion.location();
        jdbc.update("DELETE FROM media_pending_deletion WHERE storage_backend=? AND storage_bucket=? AND object_key=?",location.backend(),location.bucket(),location.key());
    }
    @Override public void failedDeletion(Deletion deletion) {
        var location=deletion.location();
        jdbc.update("UPDATE media_pending_deletion SET attempts=LEAST(attempts+1,10000),next_attempt_at=CURRENT_TIMESTAMP+make_interval(secs=>LEAST(86400,60*power(2,LEAST(attempts,10)))::double precision) WHERE storage_backend=? AND storage_bucket=? AND object_key=?",
                location.backend(),location.bucket(),location.key());
    }
    @Override public boolean eligibility(String id,long version,boolean eligible) {
        return jdbc.update("UPDATE media_asset SET archive_eligible=?,version=version+1,retention_retry_at=CURRENT_TIMESTAMP WHERE id=? AND version=?",eligible,id,version)==1;
    }
    @Override public List<TagChange> dueTags() {
        return jdbc.query("SELECT * FROM media_asset WHERE storage_backend='S3' AND retention_applied_version<>version AND retention_retry_at<=CURRENT_TIMESTAMP ORDER BY retention_retry_at LIMIT 20",
                (row,index) -> new TagChange(row.getString("id"),new StorageLocation("S3",row.getString("storage_bucket"),row.getString("object_key")),row.getBoolean("archive_eligible"),row.getLong("version")));
    }
    @Override public void appliedTag(TagChange change) {
        jdbc.update("UPDATE media_asset SET retention_applied_version=version WHERE id=? AND version=?",change.id(),change.version());
    }
    @Override public void failedTag(TagChange change) {
        jdbc.update("UPDATE media_asset SET retention_retry_at=CURRENT_TIMESTAMP+INTERVAL '5 minutes' WHERE id=? AND version=?",change.id(),change.version());
    }
    @Override public List<LocalImage> localImages(int size) {
        return jdbc.query("""
                SELECT a.id,a.storage_backend,a.storage_bucket,a.object_key,a.bytes,a.archive_eligible,a.version
                FROM media_asset a WHERE a.storage_backend='LOCAL'
                  AND NOT EXISTS(SELECT 1 FROM media_copy_reservation c WHERE c.asset_id=a.id)
                ORDER BY a.created_at,a.id LIMIT ?
                """,(row,index)->new LocalImage(row.getString("id"),new StorageLocation(row.getString("storage_backend"),row.getString("storage_bucket"),row.getString("object_key")),
                row.getInt("bytes"),row.getBoolean("archive_eligible"),row.getLong("version")),Math.clamp(size,1,20));
    }
    @Override public boolean relocate(LocalImage image,StorageLocation destination) {
        return jdbc.update("""
                UPDATE media_asset SET storage_backend=?,storage_bucket=?,object_key=?,
                  version=version+1,retention_applied_version=version+1,retention_retry_at=CURRENT_TIMESTAMP
                WHERE id=? AND version=? AND storage_backend=? AND storage_bucket=? AND object_key=?
                """,destination.backend(),destination.bucket(),destination.key(),image.id(),image.version(),image.location().backend(),image.location().bucket(),image.location().key())==1;
    }
    @Override public void queueDeletion(Deletion deletion,int bytes,Instant notBefore) {
        var location=deletion.location();
        jdbc.update("""
                INSERT INTO media_pending_deletion(asset_id,storage_backend,storage_bucket,object_key,bytes,next_attempt_at)
                VALUES (?,?,?,?,?,?) ON CONFLICT(storage_backend,storage_bucket,object_key)
                DO UPDATE SET next_attempt_at=GREATEST(media_pending_deletion.next_attempt_at,EXCLUDED.next_attempt_at)
                """,deletion.id(),location.backend(),location.bucket(),location.key(),bytes,Timestamp.from(notBefore));
    }
    @Override public boolean copyInProgress(StorageLocation location) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM media_copy_reservation WHERE storage_backend=? AND storage_bucket=? AND object_key=? AND expires_at>CURRENT_TIMESTAMP)",
                Boolean.class,location.backend(),location.bucket(),location.key()));
    }
}
