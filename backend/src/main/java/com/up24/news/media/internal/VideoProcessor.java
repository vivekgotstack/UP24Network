package com.up24.news.media.internal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.jobs.PermanentJobFailure;
import org.springframework.stereotype.Component;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import jakarta.annotation.PreDestroy;

/** Bounded native processing; no shell, remote protocols, external MOV references or uploaded command options. */
@Component
class VideoProcessor {
    record Probe(int width,int height,double duration) {}
    private final VideoSettings settings;
    private final ObjectMapper json;
    private volatile long availabilityChecked;
    private volatile boolean toolsAvailable;
    private final Set<Process> active=ConcurrentHashMap.newKeySet();
    VideoProcessor(VideoSettings settings,ObjectMapper json) { this.settings=settings;this.json=json; }
    boolean available() {
        if(System.currentTimeMillis()-availabilityChecked<60000) return toolsAvailable;
        synchronized(this) {
            try { command(List.of(settings.ffmpeg,"-version"),Duration.ofSeconds(3));command(List.of(settings.ffprobe,"-version"),Duration.ofSeconds(3));toolsAvailable=true; }
            catch(Exception exception) { toolsAvailable=false; }
            availabilityChecked=System.currentTimeMillis();return toolsAvailable;
        }
    }
    Probe probe(Path source) throws Exception {
        byte[] prefix;
        try(var input=Files.newInputStream(source)) { prefix=input.readNBytes(12); }
        if(prefix.length<12 || !Set.of("ftyp","moov","mdat","free","wide").contains(new String(prefix,4,4,StandardCharsets.US_ASCII)))
            throw new PermanentJobFailure();
        long atom=Integer.toUnsignedLong(ByteBuffer.wrap(prefix,0,4).getInt());
        if(atom<8 || atom>Files.size(source)) throw new PermanentJobFailure();
        var args=new ArrayList<>(List.of(settings.ffprobe,"-v","error","-max_alloc","67108864","-protocol_whitelist","file,pipe",
                "-f","mov","-enable_drefs","0","-use_absolute_path","0","-show_entries","format=duration:stream=codec_type,width,height,avg_frame_rate",
                "-of","json",source.toString()));
        var root=json.readTree(command(args,Duration.ofSeconds(20)));
        var streams=root.path("streams");
        if(!streams.isArray() || streams.size()>16) throw new PermanentJobFailure();
        var video=java.util.stream.StreamSupport.stream(streams.spliterator(),false).filter(s->s.path("codec_type").asText().equals("video")).findFirst().orElseThrow(PermanentJobFailure::new);
        int width=video.path("width").asInt(),height=video.path("height").asInt();
        double duration=root.path("format").path("duration").asDouble();
        if(width<2 || height<2 || width>3840 || height>3840 || (long)width*height>3840L*2160 || !Double.isFinite(duration) || duration<=0 || duration>900)
            throw new PermanentJobFailure();
        return new Probe(width,height,duration);
    }
    Probe encode(Path source,Path output) throws Exception {
        var original=probe(source);
        var args=new ArrayList<String>();
        if(!System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win") && Files.isExecutable(Path.of("/usr/bin/nice"))) args.addAll(List.of("/usr/bin/nice","-n","10"));
        args.addAll(List.of(settings.ffmpeg,"-hide_banner","-v","error","-nostdin","-y","-max_alloc","67108864","-threads","2","-filter_threads","1",
                "-protocol_whitelist","file,pipe","-f","mov","-enable_drefs","0","-use_absolute_path","0","-i",source.toString(),
                "-map","0:v:0","-map","0:a:0?","-sn","-dn","-map_metadata","-1","-map_chapters","-1",
                "-vf","scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
                "-c:v","libx264","-preset","veryfast","-crf","24","-maxrate","2000k","-bufsize","4000k","-pix_fmt","yuv420p","-r","30",
                "-c:a","aac","-b:a","128k","-threads","2","-t","900","-fs",Long.toString(settings.maxUploadBytes),"-movflags","+faststart","-f","mp4",output.toString()));
        command(args,Duration.ofMinutes(10));
        var encoded=probe(output);
        if(encoded.width()>1920 || encoded.height()>1080 || encoded.duration()<original.duration()-2 || Files.size(output)>settings.maxUploadBytes)
            throw new PermanentJobFailure();
        return encoded;
    }
    private byte[] command(List<String> args,Duration timeout) throws Exception {
        Process process=new ProcessBuilder(args).redirectErrorStream(true).start();active.add(process);
        try(var workers=Executors.newVirtualThreadPerTaskExecutor()) {
          try {
            var result=workers.submit(()->{
                try(var input=process.getInputStream()) {
                    byte[] data=input.readNBytes(65537);
                    if(data.length>65536) { process.destroyForcibly();throw new IOException("Video tool output exceeded its bound."); }
                    return data;
                }
            });
            if(!process.waitFor(timeout.toMillis(),TimeUnit.MILLISECONDS)) { process.destroyForcibly();throw new IOException("Video processing timed out."); }
            byte[] output=result.get(5,TimeUnit.SECONDS);
            if(process.exitValue()!=0) throw new IOException("The video tool could not process this file.");
            return output;
          } catch(Exception|Error exception) { terminate(process);throw exception; }
        } finally { terminate(process);active.remove(process); }
    }
    private void terminate(Process process) {
        process.descendants().forEach(child->{if(child.isAlive())child.destroyForcibly();});
        if(process.isAlive()) process.destroyForcibly();
        boolean interrupted=Thread.interrupted();
        try { process.waitFor(5,TimeUnit.SECONDS); }
        catch(InterruptedException exception) { interrupted=true; }
        finally { if(interrupted) Thread.currentThread().interrupt(); }
    }
    @PreDestroy void shutdown() { active.forEach(this::terminate); }
}
