package com.up24.news.preview.internal;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.up24.news.article.ArticleDesk;
import com.up24.news.horoscope.HoroscopeEdition;
import com.up24.news.horoscope.Horoscopes;
import com.up24.news.identity.Accounts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.IntStream;

@Component
@Profile("local-preview")
@Order(100)
class LocalPreviewData implements ApplicationRunner {
    record Story(String slug,String title,String summary,String category,String city,String image,String imageAlt,String videoUrl,List<String> paragraphs) {}
    private final Accounts accounts;
    private final ArticleDesk articles;
    private final Horoscopes horoscopes;
    private final ObjectMapper json;
    private final Clock clock;
    private final String adminEmail;
    LocalPreviewData(Accounts accounts,ArticleDesk articles,Horoscopes horoscopes,ObjectMapper json,Clock clock,
                     @Value("${up24.newsroom.admin-email}") String adminEmail) {
        this.accounts=accounts; this.articles=articles; this.horoscopes=horoscopes; this.json=json; this.clock=clock; this.adminEmail=adminEmail;
    }
    @Override public void run(ApplicationArguments arguments) throws Exception {
        Path passwordPath=Path.of(".local","preview-staff-password.txt");
        Files.createDirectories(passwordPath.getParent());
        if (!Files.exists(passwordPath)) Files.writeString(passwordPath,HexFormat.of().formatHex(new SecureRandom().generateSeed(16)));
        String password=Files.readString(passwordPath).trim();
        var editor=accounts.find("editor@preview.up24.local").orElseGet(()->accounts.create("editor@preview.up24.local","समीक्षा संपादक",password,Accounts.Role.EDITOR));
        var reporter=accounts.find("reporter@preview.up24.local").orElseGet(()->accounts.create("reporter@preview.up24.local","स्थानीय संवाददाता",password,Accounts.Role.REPORTER));
        List<Story> fixtures;
        try(var input=new ClassPathResource("preview/stories.json").getInputStream()) { fixtures=json.readValue(input,new TypeReference<>() {}); }
        var now=clock.instant();
        for(int index=0;index<fixtures.size();index++) {
            var story=fixtures.get(index);
            articles.importPublished(new ArticleDesk.Imported("local-preview:"+story.slug(),story.slug(),story.title(),story.summary(),story.category(),story.city(),
                    story.image(),story.imageAlt(),story.videoUrl(),null,story.paragraphs(),now.minusSeconds(900L+index*2400L),index==0,null));
        }
        for(int index=0;index<2;index++) {
            String slug="reporter-draft-"+(index+1);
            if(articles.list(reporter.id()).stream().noneMatch(row->row.article().slug().equals(slug))) {
                var sample=fixtures.get(index+1);
                articles.save(null,new ArticleDesk.Input("समीक्षा के लिए: "+sample.title(),slug,sample.summary(),sample.category(),sample.city(),
                        sample.image(),sample.imageAlt(),sample.videoUrl(),null,String.join("\n\n",sample.paragraphs()),null,
                        "स्थानीय प्रीव्यू की नमूना रिपोर्ट। स्रोत, स्थान और दृश्य सामग्री का विवरण संपादकीय अभ्यास के लिए जोड़ा गया है।"),reporter.id(),reporter.displayName());
            }
        }
        var day=LocalDate.now(clock.withZone(HoroscopeEdition.EDITION_ZONE));
        if (!horoscopes.hasEdition(day)) {
            List<String> names=List.of("मेष","वृषभ","मिथुन","कर्क","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुंभ","मीन");
            List<String> readings=List.of(
                    "काम की शुरुआत स्पष्ट योजना से करें। बातचीत में धैर्य रखें और परिवार के साथ समय निकालें।",
                    "रुके हुए काम व्यवस्थित करने का समय है। खर्च लिखकर रखें और जल्दबाजी में निर्णय लेने से बचें।",
                    "नई बात सीखने और पुराने संपर्कों से बातचीत करने का अवसर मिल सकता है। प्राथमिकताएं तय रखें।",
                    "घर और कार्यस्थल के बीच संतुलन बनाएं। अपने विचार सरल शब्दों में रखें और पर्याप्त विश्राम करें।",
                    "जिम्मेदारियां साझा करने से काम सहज होगा। साथियों की बात सुनें और अपनी ऊर्जा सही दिशा में लगाएं।",
                    "छोटे काम पूरे करने पर ध्यान दें। दस्तावेज व्यवस्थित रखें और दिनचर्या में नियमितता बनाए रखें।",
                    "आपसी सहयोग से काम आगे बढ़ सकता है। निर्णय से पहले उपलब्ध विकल्पों पर शांत मन से विचार करें।",
                    "अधूरे कामों की सूची बनाएं और एक-एक करके पूरा करें। अनावश्यक बहस से दूरी रखना उपयोगी होगा।",
                    "रचनात्मक काम और अध्ययन के लिए समय निकालें। यात्रा की योजना हो तो जरूरी व्यवस्थाएं पहले जांचें।",
                    "काम में निरंतरता लाभदायक रहेगी। किसी बड़े निर्णय से पहले तथ्यों को दोबारा समझना उपयोगी होगा।",
                    "नए विचारों पर साथियों से चर्चा करें। अपनी क्षमता और उपलब्ध समय के अनुसार जिम्मेदारी लें।",
                    "परिवार और मित्रों के साथ संवाद को समय दें। दिन के काम छोटे चरणों में बांटना मददगार होगा।");
            horoscopes.save(new HoroscopeEdition(day,now,IntStream.range(0,12).mapToObj(i->new HoroscopeEdition.Reading(
                    HoroscopeEdition.SIGN_IDS.get(i),names.get(i),readings.get(i),Integer.toString(i%9+1),List.of("नीला","हरा","पीला").get(i%3))).toList()),
                    "local-preview","fixture-"+day,"preview-v1");
        }
        horoscopes.setVisible(true);
        Files.writeString(Path.of(".local","preview-login.txt"),"LOCAL PREVIEW ONLY\nAdmin: "+adminEmail+" (password in admin-login.txt)\nEditor: "+editor.email()+"\nReporter: "+reporter.email()+"\nStaff password: "+password+"\nStaff sign-in: http://127.0.0.1:3000/newsroom/sign-in\nOTP mailbox: backend/.local/preview-mailbox/latest-message.txt\n");
    }
}
