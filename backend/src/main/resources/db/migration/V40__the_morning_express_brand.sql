-- Rebrand generated publication metadata without editing editorial copy or changing article addresses.
CREATE FUNCTION rebrand_publication_value_v40(value text) RETURNS text
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
    WHEN 'From the UP24Network YouTube channel.' THEN 'From TheMorningExpress on YouTube.'
    WHEN 'UP24Network की आधिकारिक वीडियो रिपोर्ट।' THEN 'TheMorningExpress की आधिकारिक वीडियो रिपोर्ट।'
    ELSE value
END;

CREATE FUNCTION rebrand_youtube_paragraphs_v40(value jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE STRICT
RETURN CASE value
    WHEN '["Watch this report on the official UP24Network YouTube channel."]'::jsonb
        THEN '["Watch this report on the official TheMorningExpress YouTube channel."]'::jsonb
    ELSE value
END;

ALTER TABLE article_record ALTER COLUMN image SET DEFAULT '/brand/the-morning-express-logo.jpg';

UPDATE article_record
SET author = rebrand_publication_value_v40(author),
    updated_byline = rebrand_publication_value_v40(updated_byline),
    image = rebrand_publication_value_v40(image)
WHERE author IS DISTINCT FROM rebrand_publication_value_v40(author)
   OR updated_byline IS DISTINCT FROM rebrand_publication_value_v40(updated_byline)
   OR image IS DISTINCT FROM rebrand_publication_value_v40(image);

UPDATE article_record
SET city = rebrand_publication_value_v40(city),
    summary = rebrand_publication_value_v40(summary),
    paragraphs = rebrand_youtube_paragraphs_v40(paragraphs)
WHERE upstream_key LIKE 'youtube:%'
  AND (city IS DISTINCT FROM rebrand_publication_value_v40(city)
       OR summary IS DISTINCT FROM rebrand_publication_value_v40(summary)
       OR paragraphs IS DISTINCT FROM rebrand_youtube_paragraphs_v40(paragraphs));

-- Revisions and open proposals can restore these fields, so they carry the same brand metadata.
UPDATE article_revision
SET snapshot = snapshot || jsonb_strip_nulls(jsonb_build_object(
    'author', rebrand_publication_value_v40(snapshot->>'author'),
    'updated_byline', rebrand_publication_value_v40(snapshot->>'updated_byline'),
    'image', rebrand_publication_value_v40(snapshot->>'image'),
    'city', CASE WHEN snapshot->>'upstream_key' LIKE 'youtube:%'
        THEN rebrand_publication_value_v40(snapshot->>'city') END,
    'summary', CASE WHEN snapshot->>'upstream_key' LIKE 'youtube:%'
        THEN rebrand_publication_value_v40(snapshot->>'summary') END,
    'paragraphs', CASE WHEN snapshot->>'upstream_key' LIKE 'youtube:%'
        THEN rebrand_youtube_paragraphs_v40(snapshot->'paragraphs') END
))
WHERE snapshot->>'author' IS DISTINCT FROM rebrand_publication_value_v40(snapshot->>'author')
   OR snapshot->>'updated_byline' IS DISTINCT FROM rebrand_publication_value_v40(snapshot->>'updated_byline')
   OR snapshot->>'image' IS DISTINCT FROM rebrand_publication_value_v40(snapshot->>'image')
   OR (snapshot->>'upstream_key' LIKE 'youtube:%' AND (
       snapshot->>'city' IS DISTINCT FROM rebrand_publication_value_v40(snapshot->>'city')
       OR snapshot->>'summary' IS DISTINCT FROM rebrand_publication_value_v40(snapshot->>'summary')
       OR snapshot->'paragraphs' IS DISTINCT FROM rebrand_youtube_paragraphs_v40(snapshot->'paragraphs')
   ));

UPDATE article_review_request
SET submitted_by = rebrand_publication_value_v40(submitted_by),
    proposed_input = proposed_input || jsonb_strip_nulls(jsonb_build_object(
        'byline', rebrand_publication_value_v40(proposed_input->>'byline'),
        'image', rebrand_publication_value_v40(proposed_input->>'image')
    ))
WHERE submitted_by IS DISTINCT FROM rebrand_publication_value_v40(submitted_by)
   OR proposed_input->>'byline' IS DISTINCT FROM rebrand_publication_value_v40(proposed_input->>'byline')
   OR proposed_input->>'image' IS DISTINCT FROM rebrand_publication_value_v40(proposed_input->>'image');

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

DROP FUNCTION rebrand_youtube_paragraphs_v40(jsonb);
DROP FUNCTION rebrand_publication_value_v40(text);
