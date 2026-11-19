package com.up24.news.publication.internal;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.publication.Publication.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.Clock;
import java.util.List;

@Component
@Order(50)
class PublicationBootstrap implements ApplicationRunner {
    private final PublicationRepository repository;
    private final ObjectMapper json;
    private final Clock clock;
    PublicationBootstrap(PublicationRepository repository, ObjectMapper json, Clock clock) { this.repository=repository; this.json=json; this.clock=clock; }
    @Transactional @Override public void run(ApplicationArguments arguments) throws Exception {
        var now=clock.instant();
        repository.seedSettings(new SettingsInput("खबर हमारी यकीन आपका",false,"",
                "उत्तर प्रदेश, भारत और दुनिया की खबरें। स्थानीय सरोकार, स्पष्ट संदर्भ और जिम्मेदार पत्रकारिता।",true,true,true,0L),now);
        try (var input=new ClassPathResource("publication/pages.json").getInputStream()) {
            List<Document> documents=json.readValue(input,new TypeReference<>() {});
            for (var document:documents) repository.seedPage(document.path().substring(1),new DocumentInput(document.label(),document.title(),
                    document.description(),document.intro(),document.sections(),0L),now);
        }
    }
}
