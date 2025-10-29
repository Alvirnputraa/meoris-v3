-- =============================================
-- SEED: homepage_deals initial data
-- =============================================

-- NOTE: The poster URLs below use time-limited signed links.
--       For long-term stability, consider mirroring via /api/cache-image
--       or storing public URLs without expiring tokens.

INSERT INTO homepage_deals (
  produk_id,
  discount_price,
  left_poster_img1_url,
  left_poster_img2_url,
  right_card_img_url,
  order_index,
  is_active,
  start_at,
  end_at
) VALUES (
  '3fca5cad-2161-4188-8d6b-23bb84a51370',
  NULL,
  'https://vtwooclhjobgdgvljauq.supabase.co/storage/v1/object/sign/sendal/Black%20and%20White%20Shoes%20Modern%20Sale%20Quick%20Create%20Facebook%20Cover%20(2).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jMGRjMzM5Ni0xY2RlLTRjMTMtOGY1YS04OTg3ZGViOTg3MzkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzZW5kYWwvQmxhY2sgYW5kIFdoaXRlIFNob2VzIE1vZGVybiBTYWxlIFF1aWNrIENyZWF0ZSBGYWNlYm9vayBDb3ZlciAoMikucG5nIiwiaWF0IjoxNzYxNDg3Mjc4LCJleHAiOjE3OTMwMjMyNzh9.58fEcqb2FR1xYVQIojuyVQysCF4tme9ECvm33INMiaE',
  'https://vtwooclhjobgdgvljauq.supabase.co/storage/v1/object/sign/sendal/Black%20and%20White%20Shoes%20Modern%20Sale%20Quick%20Create%20Facebook%20Cover%20(1).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jMGRjMzM5Ni0xY2RlLTRjMTMtOGY1YS04OTg3ZGViOTg3MzkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzZW5kYWwvQmxhY2sgYW5kIFdoaXRlIFNob2VzIE1vZGVybiBTYWxlIFF1aWNrIENyZWF0ZSBGYXNlYm9vayBDb3ZlciAoMSkucG5nIiwiaWF0IjoxNzYxNDg3MzMxLCJleHAiOjE3OTMwMjMzMzF9.gU7LUkz0hm3mVB-sxXhoNClKe6YZGVvlrdlBvJ3bwW4',
  NULL,
  1,
  TRUE,
  NOW() - INTERVAL '1 day',
  NULL
);

INSERT INTO homepage_deals (
  produk_id,
  discount_price,
  left_poster_img1_url,
  left_poster_img2_url,
  right_card_img_url,
  order_index,
  is_active,
  start_at,
  end_at
) VALUES (
  '94349b7f-46f5-4541-bc44-c742876d46bb',
  NULL,
  'https://vtwooclhjobgdgvljauq.supabase.co/storage/v1/object/sign/sendal/Black%20and%20White%20Shoes%20Modern%20Sale%20Quick%20Create%20Facebook%20Cover%20(2).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jMGRjMzM5Ni0xY2RlLTRjMTMtOGY1YS04OTg3ZGViOTg3MzkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzZW5kYWwvQmxhY2sgYW5kIFdoaXRlIFNob2VzIE1vZGVybiBTYWxlIFF1aWNrIENyZWF0ZSBGYWNlYm9vayBDb3ZlciAoMikucG5nIiwiaWF0IjoxNzYxNDg3Mjc4LCJleHAiOjE3OTMwMjMyNzh9.58fEcqb2FR1xYVQIojuyVQysCF4tme9ECvm33INMiaE',
  'https://vtwooclhjobgdgvljauq.supabase.co/storage/v1/object/sign/sendal/Black%20and%20White%20Shoes%20Modern%20Sale%20Quick%20Create%20Facebook%20Cover%20(1).png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jMGRjMzM5Ni0xY2RlLTRjMTMtOGY1YS04OTg3ZGViOTg3MzkiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJzZW5kYWwvQmxhY2sgYW5kIFdoaXRlIFNob2VzIE1vZGVybiBTYWxlIFF1aWNrIENyZWF0ZSBGYXNlYm9vayBDb3ZlciAoMSkucG5nIiwiaWF0IjoxNzYxNDg3MzMxLCJleHAiOjE3OTMwMjMzMzF9.gU7LUkz0hm3mVB-sxXhoNClKe6YZGVvlrdlBvJ3bwW4',
  '/images/produktest_section2.png',
  2,
  TRUE,
  NOW() - INTERVAL '1 day',
  NULL
);