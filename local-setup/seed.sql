--
-- PostgreSQL database dump
--

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.addresses (id, customer_phone, label, details, latitude, longitude, created_at) VALUES (1, '+9647770867660', 'بيت ابو حمزة', 'قرب محل امجد', 30.223017, 47.77747, '2026-07-11 10:24:33.743935+00');


--
-- Data for Name: broadcasts; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.broadcasts (id, message, created_at) VALUES (2, 'وصلت خضار وفواكه طازجة جديدة، اطلبوا الآن 🥬', '2026-07-11 12:11:20.828815+00');
INSERT INTO public.broadcasts (id, message, created_at) VALUES (3, 'وصلت خضار وفواكه طازجة جديدة، اطلبوا الآن 🥬', '2026-07-11 12:39:27.930369+00');
INSERT INTO public.broadcasts (id, message, created_at) VALUES (4, 'وصلت خضار وفواكه طازجة جديدة، اطلبوا الآن', '2026-07-11 13:25:49.321296+00');
INSERT INTO public.broadcasts (id, message, created_at) VALUES (5, 'وصلت خضار وفواكه طازجة جديدة، اطلبوا الآن', '2026-07-11 17:33:27.621099+00');
INSERT INTO public.broadcasts (id, message, created_at) VALUES (6, 'وصلت خضار وفواكه طازجة جديدة، اطلبوا الآن', '2026-07-11 17:51:46.997201+00');
INSERT INTO public.broadcasts (id, message, created_at) VALUES (7, 'وصلت خضار وفواكه طازجة جديدة، اطلبوا الآن', '2026-07-11 20:53:31.043746+00');
INSERT INTO public.broadcasts (id, message, created_at) VALUES (8, 'وصلت خضار وفواكه طازجة جديدة، اطلبوا الآن', '2026-07-12 02:07:05.248834+00');
INSERT INTO public.broadcasts (id, message, created_at) VALUES (9, 'وصلت خضار وفواكه طازجة جديدة، اطلبوا الآن', '2026-07-12 02:07:14.232198+00');
INSERT INTO public.broadcasts (id, message, created_at) VALUES (10, 'وصلت خضار وفواكه طازجة جديدة، اطلبوا الآن', '2026-07-12 19:52:51.717919+00');


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.categories (id, name, created_at) VALUES (1, 'طماطم وفلفل', '2026-07-11 10:13:40.244852+00');
INSERT INTO public.categories (id, name, created_at) VALUES (2, 'قرعيات', '2026-07-11 10:13:40.244852+00');
INSERT INTO public.categories (id, name, created_at) VALUES (3, 'بصليات', '2026-07-11 10:13:40.244852+00');
INSERT INTO public.categories (id, name, created_at) VALUES (4, 'ورقيات', '2026-07-11 10:13:40.244852+00');
INSERT INTO public.categories (id, name, created_at) VALUES (5, 'جذريات', '2026-07-11 10:13:40.244852+00');
INSERT INTO public.categories (id, name, created_at) VALUES (6, 'أعشاب وتوابل', '2026-07-11 10:13:40.244852+00');
INSERT INTO public.categories (id, name, created_at) VALUES (7, 'فواكه', '2026-07-11 10:35:04.063701+00');


--
-- Data for Name: customer_store_balances; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.customer_store_balances (customer_phone, store_id, points, wallet_balance, updated_at) VALUES ('+9647711112222', 2, 2, 0, '2026-07-12 21:53:44.527261+00');
INSERT INTO public.customer_store_balances (customer_phone, store_id, points, wallet_balance, updated_at) VALUES ('+9647770867660', 2, 122, 0, '2026-07-12 21:53:44.527261+00');
INSERT INTO public.customer_store_balances (customer_phone, store_id, points, wallet_balance, updated_at) VALUES ('+9647770867760', 2, 10, 0, '2026-07-12 21:53:44.527261+00');
INSERT INTO public.customer_store_balances (customer_phone, store_id, points, wallet_balance, updated_at) VALUES ('+9647731355623', 2, 17, 0, '2026-07-15 12:41:30.869+00');


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.customers (phone, points, created_at, updated_at, name, verified, avatar_url, wallet_balance) VALUES ('+9647711112222', 2, '2026-07-11 03:07:54.814426+00', '2026-07-11 03:07:54.851+00', NULL, 1, NULL, 0);
INSERT INTO public.customers (phone, points, created_at, updated_at, name, verified, avatar_url, wallet_balance) VALUES ('+9647701234567', 0, '2026-07-11 10:45:18.182492+00', '2026-07-11 10:45:18.182492+00', NULL, 1, NULL, 0);
INSERT INTO public.customers (phone, points, created_at, updated_at, name, verified, avatar_url, wallet_balance) VALUES ('+9647770867660', 122, '2026-07-11 10:23:49.313424+00', '2026-07-12 18:17:49.557+00', 'فؤاد سالم', 1, '/api/storage/objects/uploads/b1f2286a-4979-407a-8732-49fd72cb8fc3', 0);
INSERT INTO public.customers (phone, points, created_at, updated_at, name, verified, avatar_url, wallet_balance) VALUES ('+9647770867760', 10, '2026-07-12 18:07:24.871358+00', '2026-07-12 19:52:01.543+00', 'فؤاد سالم عبدالرحمن', 1, '/api/storage/objects/uploads/7867e326-dea0-4a43-9416-40df882c4576', 0);
INSERT INTO public.customers (phone, points, created_at, updated_at, name, verified, avatar_url, wallet_balance) VALUES ('+9647731355623', 11, '2026-07-12 20:56:49.374886+00', '2026-07-15 12:54:51.415+00', 'حمد سالم عبدالرحمن', 1, NULL, 250);


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (14, '+9647770867660', '[{"id": 10, "qty": 2.5, "name": "تفاح", "unit": "1 كغم", "price": 750}]', 1875, 1500, 'standard', 0, 3, 0, NULL, 3375, 30.222837, 47.777386, 'قيد التحضير', '2026-07-11 12:27:51.474225+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (15, '+9647770867660', '[{"id": 6, "qty": 4.5, "name": "فلفل رومي ملون", "unit": "1 كغم", "price": 3000}]', 13500, 1500, 'standard', 0, 15, 0, NULL, 15000, 30.222837, 47.777386, 'قيد التحضير', '2026-07-11 12:28:55.337727+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (16, '+9647770867660', '[{"id": 1, "qty": 1.5, "name": "طماطم بلدي", "unit": "1 كغم", "price": 2000}, {"id": 6, "qty": 36, "name": "فلفل رومي ملون", "unit": "1 كغم", "price": 3000}]', 111000, 1500, 'standard', 0, 112, 0, NULL, 112500, 30.222837, 47.777386, 'قيد التحضير', '2026-07-11 12:29:25.379155+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (17, '+9647770867660', '[{"id": 6, "qty": 15, "name": "فلفل رومي ملون", "unit": "1 كغم", "price": 3000}]', 45000, 1500, 'standard', 0, 46, 0, NULL, 46500, 30.222837, 47.777386, 'قيد التحضير', '2026-07-11 12:29:55.497311+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (10, '+9647770867660', '[{"id": 1, "qty": 1, "name": "طماطم بلدي", "unit": "1 كغم", "price": 2000}, {"id": 3, "qty": 1, "name": "بصل أصفر", "unit": "1 كغم", "price": 1000}]', 3000, 3000, 'express', 0, 2, 0, NULL, 6000, 30.221382, 47.775932, 'قيد التحضير', '2026-07-11 10:50:52.574264+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (11, '+9647770867660', '[{"id": 7, "qty": 1, "name": "ثوم بلدي", "unit": "250 غم", "price": 2500}]', 2500, 3000, 'express', 0, 1, 0, NULL, 5500, 30.22303, 47.77736, 'قيد التحضير', '2026-07-11 11:43:30.770241+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (7, '+9647711112222', '[{"id": 1, "qty": 2, "name": "test", "unit": "kg", "price": 1000}]', 2000, 1500, 'standard', 0, 2, 0, NULL, 3500, NULL, NULL, 'في الطريق', '2026-07-11 03:07:54.856073+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (25, '+9647770867760', '[{"id": 25, "qty": 2, "name": "موز", "unit": "1 كغم", "price": 1500}, {"id": 26, "qty": 2, "name": "بتيتة", "unit": "1 كغم", "price": 750}, {"id": 23, "qty": 1, "name": "كمثرة", "unit": "1 كغم", "price": 1000}]', 5500, 2000, 'standard', 0, 7, 0, NULL, 6000, 30.223034, 47.777325, 'في الطريق', '2026-07-12 19:52:01.787864+00', NULL, 1500, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (21, '+9647770867660', '[{"id": 10, "qty": 1, "name": "تفاح", "unit": "1 كغم", "price": 750}, {"id": 12, "qty": 5, "name": "بطيخ", "unit": "1 كغم", "price": 500}, {"id": 8, "qty": 2, "name": "باذنجان", "unit": "1 كغم", "price": 750}, {"id": 5, "qty": 1, "name": "جزر أحمر", "unit": "1 كغم", "price": 1300}]', 6050, 1500, 'standard', 0, 7, 0, NULL, 7550, 30.223063, 47.77733, 'تم التسليم', '2026-07-11 17:40:46.663525+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (8, '+9647770867660', '[{"id": 1, "qty": 3, "name": "طماطم بلدي", "unit": "1 كغم", "price": 2000}, {"id": 2, "qty": 1, "name": "خيار طازج", "unit": "1 كغم", "price": 1500}]', 7500, 1500, 'standard', 0, 4, 0, NULL, 9000, 30.221382, 47.775932, 'في الطريق', '2026-07-11 10:34:03.025879+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (9, '+9647770867660', '[{"id": 7, "qty": 1, "name": "ثوم بلدي", "unit": "250 غم", "price": 2500}]', 2500, 1500, 'standard', 0, 1, 0, NULL, 4000, 30.221382, 47.775932, 'في الطريق', '2026-07-11 10:49:06.081957+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (18, '+9647770867660', '[{"id": 6, "qty": 1, "name": "فلفل رومي ملون", "unit": "1 كغم", "price": 3000}]', 3000, 1500, 'standard', 300, 4, 100, 'discount', 4200, 30.222843, 47.7774, 'تم التسليم', '2026-07-11 12:30:46.704333+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (19, '+9647770867660', '[{"id": 10, "qty": 2, "name": "تفاح", "unit": "1 كغم", "price": 750}, {"id": 8, "qty": 1.5, "name": "باذنجان بلدي", "unit": "1 كغم", "price": 1700}, {"id": 6, "qty": 1, "name": "فلفل رومي ملون", "unit": "1 كغم", "price": 3000}]', 7050, 1500, 'standard', 0, 8, 0, NULL, 8550, 30.223057, 47.77737, 'قيد التحضير', '2026-07-11 13:19:46.063938+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (22, '+9647770867660', '[{"id": 13, "qty": 4, "name": "ركي", "unit": "1 كغم", "price": 500}, {"id": 14, "qty": 1, "name": "كرفس", "unit": "1", "price": 500}]', 2500, 1500, 'standard', 0, 4, 0, NULL, 4000, 30.223059, 47.777336, 'تم التسليم', '2026-07-11 18:05:05.425826+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (23, '+9647770867660', '[{"id": 8, "qty": 0.5, "name": "باذنجان بلدي", "unit": "1 كغم", "price": 1700}]', 850, 1500, 'standard', 0, 2, 0, NULL, 2350, 30.53, 47.79, 'قيد التحضير', '2026-07-12 18:17:49.718904+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (20, '+9647770867660', '[{"id": 6, "qty": 4, "name": "فلفل رومي ملون", "unit": "1 كغم", "price": 3000}]', 12000, 1500, 'standard', 0, 13, 0, NULL, 13500, 30.222778, 47.77742, 'تم التسليم', '2026-07-11 13:23:47.089383+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (24, '+9647770867760', '[{"id": 25, "qty": 1.5, "name": "موز", "unit": "1 كغم", "price": 1500}]', 2250, 1500, 'standard', 0, 3, 0, NULL, 3750, 30.222876, 47.777264, 'تم التسليم', '2026-07-12 18:27:05.903153+00', NULL, 0, 'اليوم بين ٦-٨ مساءً', 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (26, '+9647731355623', '[{"id": 19, "qty": 1, "name": "فلفل حار أحمر", "unit": "1 كغم", "price": 4000}, {"id": 18, "qty": 1, "name": "فلفل حار أخضر", "unit": "1 كغم", "price": 4000}, {"id": 25, "qty": 1, "name": "موز", "unit": "1 كغم", "price": 1500}, {"id": 17, "qty": 1, "name": "بصل احمر", "unit": "1 كغم", "price": 750}]', 10250, 2000, 'standard', 0, 11, 0, NULL, 12250, 30.222982, 47.777454, 'قيد التحضير', '2026-07-12 21:38:43.189277+00', NULL, 0, NULL, 2);
INSERT INTO public.orders (id, customer_phone, items, subtotal, delivery_fee, delivery_type, discount_applied, points_earned, points_redeemed, redemption_type, total, latitude, longitude, status, created_at, note, wallet_applied, pickup_time, store_id) VALUES (27, '+9647731355623', '[{"id": 2, "qty": 1, "name": "خيار طازج", "unit": "1 كغم", "price": 1500}, {"id": 1, "qty": 1.5, "name": "طماطة الزبير", "unit": "1 كغم", "price": 500}, {"id": 17, "qty": 1, "name": "بصل احمر", "unit": "1 كغم", "price": 750}, {"id": 5, "qty": 1, "name": "جزر", "unit": "1 كغم", "price": 1000}, {"id": 3, "qty": 1, "name": "بصل أصفر", "unit": "1 كغم", "price": 750}]', 4750, 2000, 'standard', 0, 6, 0, NULL, 6750, 30.22301, 47.77751, 'تم التسليم', '2026-07-15 12:41:30.906023+00', NULL, 0, NULL, 2);


--
-- Data for Name: otp_codes; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.otp_codes (phone, code, expires_at, attempts, created_at) VALUES ('+9647811772240', '885323', '2026-07-11 03:01:52.421+00', 0, '2026-07-11 02:56:52.429814+00');
INSERT INTO public.otp_codes (phone, code, expires_at, attempts, created_at) VALUES ('+9647770867760', '235679', '2026-07-12 21:01:00.344+00', 0, '2026-07-12 20:56:00.345569+00');


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (2, 'خيار طازج', 'قرعيات', 1500, NULL, '1 كغم', 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?q=80&w=600&auto=format&fit=crop', 'خيار مقرمش منتقى بعناية', 4.6, false, NULL, '2026-07-11 00:05:01.071798+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (26, 'بتيتة', 'جذريات', 750, NULL, '1 كغم', '/api/storage/objects/uploads/2230f408-595b-476b-b625-52614fcaa9da', NULL, 4.5, false, NULL, '2026-07-11 20:46:33.497619+00', true, NULL, true, true, true, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (1, 'طماطة الزبير', 'طماطم وفلفل', 500, NULL, '1 كغم', '/api/storage/objects/uploads/06717f0a-81fc-418b-a091-b81086903e6d', 'طماطم طازجة يومياً من المزرعة', 4.7, false, NULL, '2026-07-11 00:05:01.049437+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (13, 'ركي', 'فواكه', 500, NULL, '1 كغم', '/api/storage/objects/uploads/3e4ad694-fe90-44cf-becb-74e6590b5ac1', NULL, 4.5, false, NULL, '2026-07-11 17:58:19.718657+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (7, 'ثوم', 'بصليات', 1500, NULL, '1 كغم', '/api/storage/objects/uploads/9640eaaf-d277-46f9-b826-98aedae758eb', 'ثوم بلدي طازج', 4.3, false, NULL, '2026-07-11 00:05:01.120091+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (6, 'فلفل بارد', 'طماطم وفلفل', 1000, NULL, '1 كغم', '/api/storage/objects/uploads/c5d636e8-ed81-462a-bea5-8e2e8512e992', 'فلفل رومي أحمر وأصفر وأخضر', 4.6, true, NULL, '2026-07-11 00:05:01.11132+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (5, 'جزر', 'جذريات', 1000, NULL, '1 كغم', '/api/storage/objects/uploads/9c92cbf4-371f-46b5-9bdc-08c6b94ba52c', 'جزر طازج حلو المذاق', 4.5, false, NULL, '2026-07-11 00:05:01.102463+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (3, 'بصل أصفر', 'بصليات', 750, NULL, '1 كغم', '/api/storage/objects/uploads/6b582c88-7ead-437d-8ed3-4ee656ed8c4a', 'بصل جاف ممتاز للطبخ', 4.4, false, NULL, '2026-07-11 00:05:01.081896+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (15, 'بصل ابيض', 'بصليات', 750, NULL, '1 كغم', '/api/storage/objects/uploads/051b7975-a877-43f1-ad7f-503d9f040a22', NULL, 4.5, false, NULL, '2026-07-11 20:33:43.473608+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (16, 'بصل أخضر', 'بصليات', 1000, NULL, '1 كغم', '/api/storage/objects/uploads/edf84fa7-448a-4e03-a478-dbb1107f84b8', NULL, 4.5, false, NULL, '2026-07-11 20:34:09.253349+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (17, 'بصل احمر', 'بصليات', 750, NULL, '1 كغم', '/api/storage/objects/uploads/d32dd01b-2e1e-405e-8968-53f0ac750d6f', NULL, 4.5, false, NULL, '2026-07-11 20:34:38.738858+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (18, 'فلفل حار أخضر', 'طماطم وفلفل', 4000, NULL, '1 كغم', '/api/storage/objects/uploads/1bc13a76-058e-44f7-b43b-b2fa474b0497', NULL, 4.5, false, NULL, '2026-07-11 20:36:16.145493+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (19, 'فلفل حار أحمر', 'طماطم وفلفل', 4000, NULL, '1 كغم', '/api/storage/objects/uploads/d9387f69-6b5d-4663-8be9-5c25ec31fc30', NULL, 4.5, false, NULL, '2026-07-11 20:37:37.763039+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (20, 'عنب أخضر', 'فواكه', 2000, NULL, '1 كغم', '/api/storage/objects/uploads/0998f340-7318-4c33-8579-f8c34b95a3aa', NULL, 4.5, false, NULL, '2026-07-11 20:41:11.302448+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (21, 'عنب اسود', 'فواكه', 2000, NULL, '1 كغم', '/api/storage/objects/uploads/fb45e2c1-b605-496b-a14b-f030b314368e', NULL, 4.5, false, NULL, '2026-07-11 20:41:31.784253+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (22, 'عنب أحمر', 'فواكه', 1500, NULL, '1 كغم', '/api/storage/objects/uploads/3fd34715-0d8f-48cd-9327-d61dee0f303c', NULL, 4.5, false, NULL, '2026-07-11 20:42:19.554283+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (12, 'بطيخ', 'بصليات', 500, NULL, '1 كغم', '/api/storage/objects/uploads/42629a9d-23e4-4551-ba15-5eda3d749c9e', NULL, 4.5, false, NULL, '2026-07-11 13:28:39.38811+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (10, 'تفاح', 'فواكه', 750, NULL, '1 كغم', '/api/storage/objects/uploads/9b230841-bfcb-4341-bd23-6c31d8086919', NULL, 4.5, false, NULL, '2026-07-11 10:36:09.938387+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (23, 'كمثرة', 'فواكه', 1000, NULL, '1 كغم', '/api/storage/objects/uploads/04513448-6dbd-4ce2-a043-3ecaea2b2f4c', NULL, 4.5, false, NULL, '2026-07-11 20:42:44.358026+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (24, 'فراولة', 'فواكه', 1000, NULL, 'علبة', '/api/storage/objects/uploads/c1f5cb3e-9bcb-4e8e-81d7-68f9484515d7', NULL, 4.5, false, NULL, '2026-07-11 20:44:10.69055+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (25, 'موز', 'فواكه', 1500, NULL, '1 كغم', '/api/storage/objects/uploads/def380a7-4a49-4842-b962-5606652902a0', NULL, 4.5, false, NULL, '2026-07-11 20:46:09.941224+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (14, 'كرفس', 'أعشاب وتوابل', 250, NULL, 'باكة', '/api/storage/objects/uploads/d66933fc-795e-4630-9093-6fbbc5ffc745', NULL, 4.5, false, NULL, '2026-07-11 18:00:18.973056+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (4, 'سبانخ', 'أعشاب وتوابل', 1000, NULL, 'باكة', 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=600&auto=format&fit=crop', 'سبانخ خضراء غنية بالحديد', 4.8, true, NULL, '2026-07-11 00:05:01.091971+00', false, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (8, 'باذنجان', 'قرعيات', 750, NULL, '1 كغم', '/api/storage/objects/uploads/bb034f21-42c4-4327-bf4e-382fb016af58', 'باذنجان طازج مناسب للمقبلات', 4.5, false, NULL, '2026-07-11 00:05:01.129116+00', true, NULL, false, false, false, 2);
INSERT INTO public.products (id, name, category, price, original_price, unit, image_url, description, rating, is_vip, discount_percent, created_at, in_stock, discount_expires_at, is_local, is_clearance, is_wholesale, store_id) VALUES (9, 'نعناع طازج', 'أعشاب وتوابل', 250, NULL, 'باكة', '/api/storage/objects/uploads/aab0165e-c17b-455d-926b-2f9b1bd2ecb8', 'نعناع أخضر منعش', 4.7, false, NULL, '2026-07-11 00:05:01.138951+00', true, NULL, false, false, false, 2);


--
-- Data for Name: refunds; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.refunds (id, order_id, customer_phone, product_name, image_url, amount, status, created_at, reviewed_at) VALUES (1, 24, '+9647770867760', 'موز', '/api/storage/objects/uploads/3715d7c9-1b55-4a8a-9976-e26b077bd5e8', 1500, 'تم التعويض', '2026-07-12 19:14:05.93744+00', NULL);
INSERT INTO public.refunds (id, order_id, customer_phone, product_name, image_url, amount, status, created_at, reviewed_at) VALUES (2, 27, '+9647731355623', 'طماطة الزبير', '/api/storage/objects/uploads/01b0f487-18c0-43fd-a51b-5c172e7a0cf2', 250, 'تمت الموافقة', '2026-07-15 12:52:28.545404+00', '2026-07-15 12:54:51.414+00');


--
-- Data for Name: store_types; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.store_types (id, name, image_url, sort_order, created_at) VALUES (1, 'غذائية', '/api/storage/objects/uploads/428cd39b-c220-44f2-9f40-7175b598a59e', 0, '2026-07-12 21:48:34.551058+00');


--
-- Data for Name: stores; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.stores (id, name, address, description, store_type, owner_phone, image_url, status, subscription_expires_at, created_at, show_recipes, show_clearance) VALUES (3, 'صيدلية هنادي فايز', 'خور الزبير', NULL, 'صيدلية', '+9647731355623', NULL, 'مفعّل', '2027-01-12 20:59:16.125+00', '2026-07-12 20:58:34.153578+00', false, false);
INSERT INTO public.stores (id, name, address, description, store_type, owner_phone, image_url, status, subscription_expires_at, created_at, show_recipes, show_clearance) VALUES (2, 'خضار وفواكه الأصل', 'البصرة - العشار', 'محلنا الأصلي للخضار والفواكه الطازجة', 'خضار وفواكه', 'admin', NULL, 'مفعّل', '2028-01-12 20:19:00.613+00', '2026-07-12 20:19:00.613315+00', true, true);
INSERT INTO public.stores (id, name, address, description, store_type, owner_phone, image_url, status, subscription_expires_at, created_at, show_recipes, show_clearance) VALUES (4, 'ورد جوري', 'البصرة - خور الزبير', NULL, 'خياطة', '+9647731355623', '/api/storage/objects/uploads/6de6cbd9-8e21-4a91-ac94-7424ae662a2f', 'مفعّل', '2027-01-15 12:49:06.34+00', '2026-07-15 12:43:50.487803+00', false, false);


--
-- Name: addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.addresses_id_seq', 1, true);


--
-- Name: broadcasts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.broadcasts_id_seq', 10, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_id_seq', 13, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 27, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 26, true);


--
-- Name: refunds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.refunds_id_seq', 2, true);


--
-- Name: store_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.store_types_id_seq', 33, true);


--
-- Name: stores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.stores_id_seq', 4, true);


--
-- PostgreSQL database dump complete
--
