ALTER TABLE article_record ADD COLUMN region VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE article_record ADD CONSTRAINT article_region_slug CHECK (region = '' OR region ~ '^[a-z]+(-[a-z]+)*$');

-- Backfill known existing datelines once. Future assignments are explicit editorial metadata.
UPDATE article_record SET region = CASE
    WHEN lower(trim(city)) IN ('लखनऊ','lucknow','कानपुर','kanpur','प्रयागराज','prayagraj','इलाहाबाद','allahabad','वाराणसी','varanasi','बनारस','banaras','गोरखपुर','gorakhpur','नोएडा','noida','गाजियाबाद','ghaziabad','आगरा','agra','मेरठ','meerut','अयोध्या','ayodhya','बरेली','bareilly','झांसी','jhansi') THEN 'uttar-pradesh'
    WHEN lower(trim(city)) IN ('पटना','patna','गया','gaya') THEN 'bihar'
    WHEN lower(trim(city)) IN ('देहरादून','dehradun','हरिद्वार','haridwar') THEN 'uttarakhand'
    WHEN lower(trim(city)) IN ('नई दिल्ली','new delhi','दिल्ली','delhi') THEN 'delhi'
    WHEN lower(trim(city)) IN ('भोपाल','bhopal','इंदौर','indore') THEN 'madhya-pradesh'
    WHEN lower(trim(city)) IN ('जयपुर','jaipur') THEN 'rajasthan'
    WHEN lower(trim(city)) IN ('गुरुग्राम','gurugram','गुड़गांव','gurgaon') THEN 'haryana'
    WHEN lower(trim(city)) IN ('मुंबई','mumbai') THEN 'maharashtra'
    ELSE '' END;

CREATE INDEX article_region_publication_idx ON article_record(region, published_at DESC, id DESC)
    WHERE status = 'PUBLISHED';
