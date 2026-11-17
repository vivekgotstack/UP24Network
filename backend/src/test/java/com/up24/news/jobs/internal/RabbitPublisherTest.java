package com.up24.news.jobs.internal;

import com.up24.news.jobs.BackgroundJobs;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import java.time.Instant;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RabbitPublisherTest {
    @Test void onlyAnIdentifierCrossesTheBrokerAndUnconfirmedPublicationFails() throws Exception {
        var template=mock(RabbitTemplate.class);var publisher=new RabbitJobConfiguration().rabbitJobPublisher(template);
        var job=new JobStore.Dispatch(UUID.randomUUID(),BackgroundJobs.Lane.MAIL,Instant.now().plusSeconds(300),UUID.randomUUID());
        doAnswer(call->{
            Message message=call.getArgument(2);CorrelationData correlation=call.getArgument(3);
            assertThat(new String(message.getBody(),java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo(job.id().toString());
            assertThat(message.getMessageProperties().getDeliveryMode()).isEqualTo(MessageDeliveryMode.PERSISTENT);
            correlation.getFuture().complete(new CorrelationData.Confirm(true,null));return null;
        }).when(template).send(anyString(),anyString(),any(Message.class),any(CorrelationData.class));
        publisher.publish(job);
        doAnswer(call->{CorrelationData correlation=call.getArgument(3);correlation.getFuture().complete(new CorrelationData.Confirm(false,"rejected"));return null;})
                .when(template).send(anyString(),anyString(),any(Message.class),any(CorrelationData.class));
        assertThatThrownBy(()->publisher.publish(job)).isInstanceOf(IllegalStateException.class);
    }
}
