package com.up24.news.media.internal;

import com.up24.news.media.MediaVideos;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
class JdbcVideoStore implements VideoStore {
    private static final RowMapper<Stored> ROW=(row,index)->{
        UUID id=row.getObject("id",UUID.class);
        var view=new MediaVideos.Video(id,row.getString("original_name"),row.getString("state"),row.getLong("original_bytes"),row.getLong("stored_bytes"),
                row.getInt("width"),row.getInt("height"),row.getDouble("duration_seconds"),"/media/videos/"+id+".mp4",row.getString("last_error"),row.getLong("version"),row.getTimestamp("created_at").toInstant());
        String backend=row.getString("storage_backend"),bucket=row.getString("storage_bucket"),output=row.getString("output_key");
        return new Stored(view,row.getObject("uploaded_by",UUID.class),new StorageLocation(backend,bucket,row.getString("source_key")),
                output==null?null:new StorageLocation(backend,bucket,output),row.getObject("job_id",UUID.class),row.getObject("processing_token",UUID.class),row.getTimestamp("upload_expires_at").toInstant());
    };
    private final JdbcTemplate jdbc;
    JdbcVideoStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    @Override public Optional<Stored> find(UUID id) { return jdbc.query("SELECT * FROM video_asset WHERE id=?",ROW,id).stream().findFirst(); }
    @Override public Optional<Stored> lock(UUID id) { return jdbc.query("SELECT * FROM video_asset WHERE id=? FOR UPDATE",ROW,id).stream().findFirst(); }
    @Override public void quotaLock() { jdbc.execute("SELECT pg_advisory_xact_lock(8524,2101)"); }
    @Override public long reservedBytes() { return jdbc.queryForObject("SELECT COALESCE(sum(reserved_bytes),0) FROM video_asset",Long.class); }
    @Override public void insert(UUID id,String name,long bytes,long reserved,UUID owner,StorageLocation source,Instant expiresAt) {
        jdbc.update("INSERT INTO video_asset(id,uploaded_by,original_name,original_bytes,reserved_bytes,storage_backend,storage_bucket,source_key,upload_expires_at) VALUES (?,?,?,?,?,?,?,?,?)",
                id,owner,name,bytes,reserved,source.backend(),source.bucket(),source.key(),Timestamp.from(expiresAt));
    }
    @Override public MediaVideos.Page list(UUID actor,boolean privileged,int page,int size) {
        String where=privileged?"":" WHERE uploaded_by=?";
        Object[] values=privileged?new Object[]{}:new Object[]{actor};
        long total=jdbc.queryForObject("SELECT count(*) FROM video_asset"+where,Long.class,values);
        int pages=Math.max(1,(int)Math.ceil((double)total/size)),current=Math.min(page,pages);
        var args=new java.util.ArrayList<Object>(List.of(values));args.add(size);args.add((long)(current-1)*size);
        var items=jdbc.query("SELECT * FROM video_asset"+where+" ORDER BY created_at DESC,id LIMIT ? OFFSET ?",ROW,args.toArray()).stream().map(Stored::view).toList();
        return new MediaVideos.Page(items,total,current,size,pages,reservedBytes(),0,false,0);
    }
    @Override public void queued(UUID id,UUID jobId) {
        jdbc.update("UPDATE video_asset SET state='QUEUED',job_id=?,processing_token=NULL,last_error=NULL,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",jobId,id);
    }
    @Override public boolean acquireUpload(UUID id,UUID token) {
        return jdbc.update("UPDATE video_asset SET upload_token=?,upload_lease_until=CURRENT_TIMESTAMP+INTERVAL '30 minutes' WHERE id=? AND state='UPLOADING' AND upload_expires_at>CURRENT_TIMESTAMP AND (upload_lease_until IS NULL OR upload_lease_until<CURRENT_TIMESTAMP)",token,id)==1;
    }
    @Override public void releaseUpload(UUID id,UUID token) { jdbc.update("UPDATE video_asset SET upload_token=NULL,upload_lease_until=NULL WHERE id=? AND upload_token=?",id,token); }
    @Override public boolean processing(UUID id,UUID token) {
        return jdbc.update("UPDATE video_asset SET state='PROCESSING',processing_token=?,last_error=NULL,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state IN ('QUEUED','PROCESSING')",token,id)==1;
    }
    @Override public boolean ready(UUID id,UUID token,StorageLocation output,long bytes,String checksum,VideoProcessor.Probe probe) {
        return jdbc.update("UPDATE video_asset SET state='READY',output_key=?,stored_bytes=?,reserved_bytes=original_bytes+?,checksum=?,width=?,height=?,duration_seconds=?,processing_token=NULL,last_error=NULL,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='PROCESSING' AND processing_token=?",
                output.key(),bytes,bytes,checksum,probe.width(),probe.height(),probe.duration(),id,token)==1;
    }
    @Override public void failed(UUID id,UUID token,boolean terminal) {
        jdbc.update("UPDATE video_asset SET state=?,processing_token=NULL,last_error=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND processing_token=?",
                terminal?"FAILED":"QUEUED",terminal?"Video processing failed. Check the file format or retry after reviewing service configuration.":"Processing will retry automatically.",id,token);
    }
    @Override public void deleting(UUID id,UUID jobId) {
        jdbc.update("UPDATE video_asset SET state='DELETING',job_id=?,processing_token=NULL,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",jobId,id);
    }
    @Override public void delete(UUID id) { jdbc.update("DELETE FROM video_asset WHERE id=? AND state='DELETING'",id); }
    @Override public List<UUID> abandoned() {
        return jdbc.query("SELECT id FROM video_asset WHERE state='UPLOADING' AND upload_expires_at<CURRENT_TIMESTAMP AND (upload_lease_until IS NULL OR upload_lease_until<CURRENT_TIMESTAMP) ORDER BY upload_expires_at LIMIT 10",(row,index)->row.getObject(1,UUID.class));
    }
}
