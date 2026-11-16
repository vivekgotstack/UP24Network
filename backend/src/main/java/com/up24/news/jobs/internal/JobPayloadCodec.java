package com.up24.news.jobs.internal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.UUID;

@Component
class JobPayloadCodec {
    private final ObjectMapper json;
    private final SecretKeySpec key;
    private final SecureRandom random=new SecureRandom();
    JobPayloadCodec(ObjectMapper json,@Value("${up24.jobs.encryption-secret:${up24.newsroom.otp-secret}}") String secret) throws Exception {
        if(!secret.matches("[a-fA-F0-9]{64}")) throw new IllegalStateException("Configure the background-job encryption secret.");
        var digest=MessageDigest.getInstance("SHA-256");digest.update("UP24/jobs/v1".getBytes(StandardCharsets.US_ASCII));
        key=new SecretKeySpec(digest.digest(HexFormat.of().parseHex(secret)),"AES");this.json=json;
    }
    byte[] encode(UUID id,Object payload) {
        try {
            byte[] clear=json.writeValueAsBytes(payload);
            if(clear.length>32768) throw new IllegalArgumentException("A job payload must fit within 32 KiB.");
            byte[] nonce=new byte[12];random.nextBytes(nonce);
            var cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key,new GCMParameterSpec(128,nonce));
            cipher.updateAAD(id.toString().getBytes(StandardCharsets.US_ASCII));
            byte[] sealed=cipher.doFinal(clear);
            return ByteBuffer.allocate(12+sealed.length).put(nonce).put(sealed).array();
        } catch(IllegalArgumentException exception) { throw exception; }
        catch(Exception exception) { throw new IllegalStateException("The job payload could not be protected."); }
    }
    JsonNode decode(UUID id,byte[] sealed) throws Exception {
        if(sealed==null || sealed.length<28 || sealed.length>32800) throw new IllegalArgumentException("Invalid protected job payload.");
        var cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,sealed,0,12));
        cipher.updateAAD(id.toString().getBytes(StandardCharsets.US_ASCII));
        return json.readTree(cipher.doFinal(sealed,12,sealed.length-12));
    }
}
