package com.up24.news.jobs.internal;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.annotation.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.amqp.SimpleRabbitListenerContainerFactoryConfigurer;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableRabbit
@Import(RabbitAutoConfiguration.class)
@ConditionalOnProperty(name="up24.jobs.transport",havingValue="rabbitmq")
class RabbitJobConfiguration {
    static final String EXCHANGE="up24.jobs",DEAD="up24.jobs.dead",MAIL="up24.jobs.mail",MEDIA="up24.jobs.media";
    @Bean Declarables jobTopology() {
        var exchange=new DirectExchange(EXCHANGE,true,false);var dead=new DirectExchange(DEAD,true,false);
        var mail=QueueBuilder.durable(MAIL).quorum().deadLetterExchange(DEAD).deadLetterRoutingKey("failed")
                .maxLength(10000).overflow(QueueBuilder.Overflow.rejectPublish).withArgument("x-delivery-limit",5).build();
        var media=QueueBuilder.durable(MEDIA).quorum().deadLetterExchange(DEAD).deadLetterRoutingKey("failed")
                .maxLength(10000).overflow(QueueBuilder.Overflow.rejectPublish).withArgument("x-delivery-limit",5).build();
        var failed=QueueBuilder.durable("up24.jobs.failed").maxLength(1000).ttl(86400000).build();
        return new Declarables(exchange,dead,mail,media,failed,BindingBuilder.bind(mail).to(exchange).with("mail"),
                BindingBuilder.bind(media).to(exchange).with("media"),BindingBuilder.bind(failed).to(dead).with("failed"));
    }
    @Bean SimpleRabbitListenerContainerFactory jobListenerFactory(SimpleRabbitListenerContainerFactoryConfigurer configurer,ConnectionFactory connection) {
        var factory=new SimpleRabbitListenerContainerFactory();configurer.configure(factory,connection);
        factory.setPrefetchCount(1);factory.setDefaultRequeueRejected(false);factory.setMissingQueuesFatal(false);return factory;
    }
    @Bean JobPublisher rabbitJobPublisher(RabbitTemplate template) {
        template.setMandatory(true);
        return job -> {
            var correlation=new CorrelationData(UUID.randomUUID().toString());
            var message=MessageBuilder.withBody(job.id().toString().getBytes(StandardCharsets.US_ASCII)).setContentType("text/plain")
                    .setDeliveryMode(MessageDeliveryMode.PERSISTENT).setMessageId(job.id().toString())
                    .setExpiration(Long.toString(Math.max(1,Duration.between(Instant.now(),job.expiresAt()).toMillis()))).build();
            template.send(EXCHANGE,job.lane().name().toLowerCase(java.util.Locale.ROOT),message,correlation);
            var confirm=correlation.getFuture().get(5,TimeUnit.SECONDS);
            if(!confirm.isAck() || correlation.getReturned()!=null) throw new IllegalStateException("Broker delivery was not confirmed.");
        };
    }
    @Bean RabbitJobConsumer rabbitJobConsumer(JobRunner runner) { return new RabbitJobConsumer(runner); }
    static class RabbitJobConsumer {
        private final JobRunner runner;
        RabbitJobConsumer(JobRunner runner) { this.runner=runner; }
        private void receive(Message message) {
            if(message.getBody().length!=36) return;
            try { runner.run(UUID.fromString(new String(message.getBody(),StandardCharsets.US_ASCII))); }
            catch(IllegalArgumentException invalid) { /* Never deserialize Java types supplied by a broker message. */ }
        }
        @RabbitListener(queues=MAIL,containerFactory="jobListenerFactory",concurrency="2") void mail(Message message) { receive(message); }
        @RabbitListener(queues=MEDIA,containerFactory="jobListenerFactory",concurrency="1") void media(Message message) { receive(message); }
    }
}
