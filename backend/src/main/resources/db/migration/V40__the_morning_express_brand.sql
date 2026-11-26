-- Rebrand generated publication metadata without editing editorial copy or changing article addresses.
CREATE FUNCTION pg_temp.rebrand_publication_value(value text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT
RETURN CASE value
    WHEN 'UP24Network Admin' THEN 'TheMorningExpress Admin'
    WHEN 'UP24Network Editorial Team' THEN 'TheMorningExpress Editorial Team'
    WHEN 'UP24 Editorial Desk' THEN 'TheMorningExpress Editorial Team'
    WHEN 'UP24Network Desk' THEN 'TheMorningExpress Desk'
    WHEN 'UP24 Visual Desk' THEN 'TheMorningExpress Visual Desk'
    WHEN '/brand/up24-logo.png' THEN '/brand/the-morning-express-logo.jpg'
    WHEN '/brand/newsroom-banner.png' THEN '/brand/the-morning-express-logo.jpg'
    WHEN 'UP24Network' THEN 'TheMorningExpress'
    WHEN 'From the UP24Network YouTube channel.' THEN 'From the TheMorningExpress YouTube channel.'
    WHEN 'UP24Network की आधिकारिक वीडियो रिपोर्ट।' THEN 'TheMorningExpress की आधिकारिक वीडियो रिपोर्ट।'
    ELSE value
END;

CREATE FUNCTION pg_temp.rebrand_youtube_paragraphs(value jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE STRICT
RETURN CASE value
    WHEN '["Watch this report on the official UP24Network YouTube channel."]'::jsonb
        THEN '["Watch this report on the official TheMorningExpress YouTube channel."]'::jsonb
    ELSE value
END;

ALTER TABLE article_record ALTER COLUMN image SET DEFAULT '/brand/the-morning-express-logo.jpg';

UPDATE article_record
SET author = pg_temp.rebrand_publication_value(author),
    updated_byline = pg_temp.rebrand_publication_value(updated_byline),
    image = pg_temp.rebrand_publication_value(image)
WHERE author IS DISTINCT FROM pg_temp.rebrand_publication_value(author)
   OR updated_byline IS DISTINCT FROM pg_temp.rebrand_publication_value(updated_byline)
   OR image IS DISTINCT FROM pg_temp.rebrand_publication_value(image);

UPDATE article_record
SET city = pg_temp.rebrand_publication_value(city),
    summary = pg_temp.rebrand_publication_value(summary),
    paragraphs = pg_temp.rebrand_youtube_paragraphs(paragraphs)
WHERE upstream_key LIKE 'youtube:%'
  AND (city IS DISTINCT FROM pg_temp.rebrand_publication_value(city)
       OR summary IS DISTINCT FROM pg_temp.rebrand_publication_value(summary)
       OR paragraphs IS DISTINCT FROM pg_temp.rebrand_youtube_paragraphs(paragraphs));

-- Revisions and open proposals can restore these fields, so they carry the same brand metadata.
UPDATE article_revision
SET snapshot = snapshot || jsonb_strip_nulls(jsonb_build_object(
    'author', pg_temp.rebrand_publication_value(snapshot->>'author'),
    'updated_byline', pg_temp.rebrand_publication_value(snapshot->>'updated_byline'),
    'image', pg_temp.rebrand_publication_value(snapshot->>'image'),
    'city', CASE WHEN snapshot->>'upstream_key' LIKE 'youtube:%'
        THEN pg_temp.rebrand_publication_value(snapshot->>'city') END,
    'summary', CASE WHEN snapshot->>'upstream_key' LIKE 'youtube:%'
        THEN pg_temp.rebrand_publication_value(snapshot->>'summary') END,
    'paragraphs', CASE WHEN snapshot->>'upstream_key' LIKE 'youtube:%'
        THEN pg_temp.rebrand_youtube_paragraphs(snapshot->'paragraphs') END
))
WHERE snapshot->>'author' IS DISTINCT FROM pg_temp.rebrand_publication_value(snapshot->>'author')
   OR snapshot->>'updated_byline' IS DISTINCT FROM pg_temp.rebrand_publication_value(snapshot->>'updated_byline')
   OR snapshot->>'image' IS DISTINCT FROM pg_temp.rebrand_publication_value(snapshot->>'image')
   OR (snapshot->>'upstream_key' LIKE 'youtube:%' AND (
       snapshot->>'city' IS DISTINCT FROM pg_temp.rebrand_publication_value(snapshot->>'city')
       OR snapshot->>'summary' IS DISTINCT FROM pg_temp.rebrand_publication_value(snapshot->>'summary')
       OR snapshot->'paragraphs' IS DISTINCT FROM pg_temp.rebrand_youtube_paragraphs(snapshot->'paragraphs')
   ));

UPDATE article_review_request
SET submitted_by = pg_temp.rebrand_publication_value(submitted_by),
    proposed_input = proposed_input || jsonb_strip_nulls(jsonb_build_object(
        'byline', pg_temp.rebrand_publication_value(proposed_input->>'byline'),
        'image', pg_temp.rebrand_publication_value(proposed_input->>'image')
    ))
WHERE submitted_by IS DISTINCT FROM pg_temp.rebrand_publication_value(submitted_by)
   OR proposed_input->>'byline' IS DISTINCT FROM pg_temp.rebrand_publication_value(proposed_input->>'byline')
   OR proposed_input->>'image' IS DISTINCT FROM pg_temp.rebrand_publication_value(proposed_input->>'image');

UPDATE identity_account
SET display_name = 'TheMorningExpress Admin'
WHERE role = 'ADMIN' AND display_name = 'UP24Network Admin';

UPDATE automation_job
SET name = 'TheMorningExpress news import'
WHERE job_key = 'news' AND name = 'UP24Network news import';

-- Rewrite brand mentions in CMS copy without rewriting existing URLs or contact addresses.
UPDATE publication_page
SET content = regexp_replace(content::text, '(?<![@/])\mUP24[ ]*Network\M(?![./@][A-Za-z0-9])',
    'TheMorningExpress', 'gi')::jsonb
WHERE content::text ~* '(?<![@/])\mUP24[ ]*Network\M(?![./@][A-Za-z0-9])';

UPDATE publication_settings
SET content = content || jsonb_strip_nulls(jsonb_build_object(
    'tagline', regexp_replace(content->>'tagline', '(?<![@/])\mUP24[ ]*Network\M(?![./@][A-Za-z0-9])', 'TheMorningExpress', 'gi'),
    'announcement', regexp_replace(content->>'announcement', '(?<![@/])\mUP24[ ]*Network\M(?![./@][A-Za-z0-9])', 'TheMorningExpress', 'gi'),
    'footerDescription', regexp_replace(content->>'footerDescription', '(?<![@/])\mUP24[ ]*Network\M(?![./@][A-Za-z0-9])', 'TheMorningExpress', 'gi')
))
WHERE concat_ws(' ', content->>'tagline', content->>'announcement', content->>'footerDescription')
    ~* '(?<![@/])\mUP24[ ]*Network\M(?![./@][A-Za-z0-9])';
