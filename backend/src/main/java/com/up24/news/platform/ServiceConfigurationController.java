package com.up24.news.platform;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/** Configuration presence only; secret values and provider responses never leave the server. */
@RestController
@RequestMapping("/api/admin/operations/services")
@PreAuthorize("@access.hasAny('ADMIN')")
class ServiceConfigurationController {
    record Service(String id,String name,boolean configured,boolean required,String detail) {}
    private final List<Service> services;
    ServiceConfigurationController(Environment environment,
            @Value("${up24.providers.brevo.api-key:}") String brevoKey,
            @Value("${up24.providers.brevo.sender-email:}") String sender,
            @Value("${up24.providers.youtube.api-key:}") String youtube,
            @Value("${up24.providers.astrologics.api-key:}") String astrology,
            @Value("${up24.media.storage:local}") String storage,
            @Value("${up24.media.s3.bucket:}") String bucket,
            @Value("${up24.media.s3.cdn-url:}") String cdn,
            @Value("${up24.jobs.transport:local}") String transport,
            @Value("${spring.rabbitmq.password:}") String brokerPassword) {
        boolean preview=environment.acceptsProfiles(Profiles.of("local-preview"));
        boolean s3=!preview && storage.equalsIgnoreCase("s3");
        services=List.of(
                new Service("email",preview?"Preview mailbox":"Brevo transactional email",preview || !brevoKey.isBlank()&&!sender.isBlank(),true,
                        preview?"Local codes are written to the private preview mailbox; no email is sent.":"The API key and sender are checked for presence. Verify the sender in Brevo before deployment."),
                new Service("jobs",transport.equals("rabbitmq")?"RabbitMQ":"Local durable worker",!transport.equals("rabbitmq") || !brokerPassword.isBlank(),true,
                        "Job status is persisted in PostgreSQL. Container readiness and delivery outcomes provide connectivity checks."),
                new Service("media",s3?"S3 and CloudFront":"Local media storage",!s3 || !bucket.isBlank()&&!cdn.isBlank(),s3,
                        s3?"Bucket and delivery origin are configured. AWS credentials are resolved server-side when used.":"Local media remains available. Select S3 after completing your cloud configuration."),
                new Service("youtube","YouTube Data API",!youtube.isBlank(),false,
                        youtube.isBlank()?"The approved channel RSS adapter remains available. Add a key for the Data API adapter.":"Key present; approved channel and response metadata are validated on each import."),
                new Service("rashifal","Hindi Rashifal provider",!astrology.isBlank(),false,
                        "The provider key is server-side. Visibility and import schedules remain controlled in Automations.")
        );
    }
    @GetMapping List<Service> configuration() { return services; }
}
