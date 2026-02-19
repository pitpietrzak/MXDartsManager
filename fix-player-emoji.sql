-- Clean up emoji column for ALL players
-- 
-- 1. Remove ASCII characters (range 00-7F hex)
--    This strips out English text, numbers, punctuation, etc.
UPDATE players
SET emoji = REGEXP_REPLACE(emoji, '[\x00-\x7F]', '', 'g');

-- 2. Truncate to maximum 2 characters
--    This effectively keeps the first 1-2 emojis.
--    Note: Some complex emojis (like flags or families) are multiple unicode characters joined by ZWJ.
--    Splitting them might break the visual representation, but it enforces the length constraint.
UPDATE players
SET emoji = SUBSTRING(emoji, 1, 2);

-- 3. Set default if empty or NULL
--    If a player only had text (e.g. "John"), step 1 made it empty.
--    This sets it to an Alien 👽.
UPDATE players
SET emoji = '👽'
WHERE emoji = '' OR emoji IS NULL;
