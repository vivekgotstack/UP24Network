package com.up24.news.jobs.internal;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class JobPayloadCodecTest {
    @Test void protectedPayloadsAreBoundToTheirJobAndRejectTampering() throws Exception {
        var codec=new JobPayloadCodec(new ObjectMapper().findAndRegisterModules(),"c".repeat(64));
        var id=UUID.randomUUID();var protectedValue=codec.encode(id,Map.of("code","123456","recipient","private@example.test"));
        assertThat(new String(protectedValue,StandardCharsets.ISO_8859_1)).doesNotContain("123456","private@example.test");
        assertThat(codec.decode(id,protectedValue).path("code").asText()).isEqualTo("123456");
        assertThatThrownBy(()->codec.decode(UUID.randomUUID(),protectedValue)).isInstanceOf(GeneralSecurityException.class);
        protectedValue[protectedValue.length-1]^=1;
        assertThatThrownBy(()->codec.decode(id,protectedValue)).isInstanceOf(GeneralSecurityException.class);
        assertThatThrownBy(()->codec.encode(id,Map.of("oversized","x".repeat(33000)))).isInstanceOf(IllegalArgumentException.class);
    }
}
