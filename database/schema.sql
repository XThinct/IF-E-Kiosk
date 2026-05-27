-- ============================================================
-- IF E-KIOSK — Database Schema
-- Run this file once in your PostgreSQL database (ekiosk)
-- ============================================================

-- Drop existing tables (order matters due to foreign keys)
DROP TABLE IF EXISTS dosen_occupants;
DROP TABLE IF EXISTS dosen_rooms;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS rooms;

-- ============================================================
-- Rooms (Kelas — Lantai 1, 3, 4)
-- ============================================================
CREATE TABLE rooms (
  id   SERIAL PRIMARY KEY,
  name TEXT   NOT NULL UNIQUE   -- e.g. IF_101, IF_102
);

-- ============================================================
-- Schedules (Jadwal Kelas)
-- ============================================================
CREATE TABLE schedules (
  id         SERIAL  PRIMARY KEY,
  room_id    INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  day        TEXT    NOT NULL,  -- Senin, Selasa, Rabu, Kamis, Jumat
  start_time TEXT    NOT NULL,  -- format HH:MM  e.g. 07:00
  end_time   TEXT    NOT NULL,  -- format HH:MM  e.g. 09:00
  class_code TEXT,              -- e.g. IF3101
  subject    TEXT    NOT NULL,  -- e.g. Basis Data
  lecturer   TEXT               -- e.g. Dr. Budi Santoso
);

-- ============================================================
-- Dosen Rooms (Lantai 2)
-- type = 'dosen' → has occupants; type = 'room' → label only
-- ============================================================
CREATE TABLE dosen_rooms (
  id        SERIAL PRIMARY KEY,
  room_name TEXT   NOT NULL UNIQUE,          -- e.g. IF_222
  type      TEXT   NOT NULL DEFAULT 'dosen', -- 'dosen' | 'room'
  label     TEXT                             -- used when type = 'room'
);

CREATE TABLE dosen_occupants (
  id         SERIAL  PRIMARY KEY,
  room_id    INTEGER NOT NULL REFERENCES dosen_rooms(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Example schedule data — remove or modify as needed
-- ============================================================

INSERT INTO rooms (name) VALUES
  ('IF_101'),
  ('IF_102'),
  ('IF_103');

INSERT INTO schedules (room_id, day, start_time, end_time, class_code, subject, lecturer) VALUES
  (1, 'Senin',  '07:00', '09:30', 'IF3101', 'Basis Data',           'Dr. Budi Santoso'),
  (1, 'Selasa', '10:00', '12:30', 'IF3102', 'Pemrograman Web',      'Dr. Ani Rahayu'),
  (2, 'Rabu',   '13:00', '15:30', 'IF3103', 'Jaringan Komputer',    'Dr. Citra Dewi'),
  (2, 'Kamis',  '07:00', '09:30', 'IF3104', 'Sistem Operasi',       'Dr. Dian Purnama'),
  (3, 'Jumat',  '10:00', '12:30', 'IF3105', 'Kecerdasan Buatan',    'Dr. Eko Prasetyo');

-- ============================================================
-- Dosen room seed data (Lantai 2)
-- ============================================================

INSERT INTO dosen_rooms (room_name, type, label) VALUES
  ('IF_222', 'room',  'Alumni Corner'),
  ('IF_223', 'dosen', NULL),
  ('IF_224', 'dosen', NULL),
  ('IF_225', 'dosen', NULL),
  ('IF_226', 'dosen', NULL),
  ('IF_227', 'dosen', NULL),
  ('IF_228', 'dosen', NULL),
  ('IF_229', 'dosen', NULL),
  ('IF_230', 'dosen', NULL),
  ('IF_231', 'dosen', NULL),
  ('IF_232', 'dosen', NULL),
  ('IF_233', 'dosen', NULL),
  ('IF_234', 'dosen', NULL),
  ('IF_235', 'dosen', NULL),
  ('IF_237', 'room', 'Mushola');

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Prof. Ir. Ary Mazharuddin Shiddiqi, S.Kom., M.Comp.Sc., Ph.D', 1 FROM dosen_rooms WHERE room_name = 'IF_223';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Prof. Dr. Umi Laili Yuhana, S.Kom., M.Sc.', 1 FROM dosen_rooms WHERE room_name = 'IF_224';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Ir. Siti Rochimah, MT., Ph.D.', 2 FROM dosen_rooms WHERE room_name = 'IF_224';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Sarwosri, S.Kom., MT.', 3 FROM dosen_rooms WHERE room_name = 'IF_224';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Anny Yuniarti, S.Kom., M.Comp.Sc.', 1 FROM dosen_rooms WHERE room_name = 'IF_225';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dini Adni Navastara, S.Kom., M.Sc.', 1 FROM dosen_rooms WHERE room_name = 'IF_226';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Wijayanti Nurul Khotimah, S.Kom., M.Sc., Ph.D.', 1 FROM dosen_rooms WHERE room_name = 'IF_227';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Prof. Dr. Eng. Nanik Suciati, S.Kom., M.Kom.', 2 FROM dosen_rooms WHERE room_name = 'IF_227';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Imam Kuswardayan, S.Kom., MT.', 1 FROM dosen_rooms WHERE room_name = 'IF_228';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Eng. Darlis Herumurti, S.Kom., M.Kom.', 2 FROM dosen_rooms WHERE room_name = 'IF_228';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Pak Daniel', 1 FROM dosen_rooms WHERE room_name = 'IF_229';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Ir. Ratih Nur Esti Anggraini, S.Kom., M.Sc., Ph.D.', 1 FROM dosen_rooms WHERE room_name = 'IF_230';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Shintami Chusnul Hidayati, S.Kom., M.Sc., Ph.D.', 2 FROM dosen_rooms WHERE room_name = 'IF_230';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Bintang Nuralamsyah, S.Kom, M.Kom.', 1 FROM dosen_rooms WHERE room_name = 'IF_231';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Ir. Dwi Sunaryono, S.Kom., M.Kom.', 1 FROM dosen_rooms WHERE room_name = 'IF_232';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Rizky Januar Akbar, S.Kom., M.Eng.', 1 FROM dosen_rooms WHERE room_name = 'IF_233';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Hadziq Fabroyir, S.Kom., Ph.D.', 2 FROM dosen_rooms WHERE room_name = 'IF_233';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Arya Yudhi Wijaya, S.Kom, M.Kom.', 1 FROM dosen_rooms WHERE room_name = 'IF_234';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Radityo Anggoro, S.Kom., M.Sc.', 2 FROM dosen_rooms WHERE room_name = 'IF_234';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Hudan Studiawan, S.Kom., M.Kom., Ph.D.', 1 FROM dosen_rooms WHERE room_name = 'IF_235';

-- IF_237_ is the actual mesh name in the OBJ (trailing underscore is intentional)

INSERT INTO dosen_rooms (room_name, type, label) VALUES
  ('IF_201', 'dosen', NULL),
  ('IF_202', 'room',  'Mushola'),
  ('IF_203', 'dosen', NULL),
  ('IF_204', 'dosen', NULL),
  ('IF_205', 'dosen', NULL),
  ('IF_206', 'dosen', NULL),
  ('IF_207', 'dosen', NULL),
  ('IF_208', 'dosen', NULL),
  ('IF_209', 'dosen', NULL),
  ('IF_210', 'dosen', NULL),
  ('IF_211', 'dosen', NULL),
  ('IF_212', 'dosen', NULL),
  ('IF_213', 'dosen', NULL),
  ('IF_214', 'dosen', NULL),
  ('IF_215', 'dosen', NULL),
  ('IF_216', 'dosen', NULL),
  ('IF_217A', 'room', 'Ruang Rapat'),
  ('IF_217B', 'room', 'Ruang Rapat'),
  ('IF_218', 'dosen', NULL);

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Ir. Misbakhul Munir Irfan Subakti, S.Kom., M.Sc.Eng, M.Phil, IPM.', 1 FROM dosen_rooms WHERE room_name = 'IF_201';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Wahyu Suadi, S.Kom, M.Kom.', 1 FROM dosen_rooms WHERE room_name = 'IF_203';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Yudhi Purwananto, S.Kom., M.Kom.', 2 FROM dosen_rooms WHERE room_name = 'IF_203';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Rully Soelaiman, S.Kom, M.Kom.', 1 FROM dosen_rooms WHERE room_name = 'IF_204';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Victor Hariadi, S.Si., M.Kom.', 1 FROM dosen_rooms WHERE room_name = 'IF_205';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Ir. Ahmad Saikhu, S.Si., MT.', 2 FROM dosen_rooms WHERE room_name = 'IF_205';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Moch. Nafkhan Alzamzami, S.T., M.T.', 1 FROM dosen_rooms WHERE room_name = 'IF_206';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Aldinata Rizky Revanda, S.Kom., M.Kom.', 2 FROM dosen_rooms WHERE room_name = 'IF_206';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Prof. Daniel Oranova Siahaan, S.Kom., M.Sc. PD.Eng.', 1 FROM dosen_rooms WHERE room_name = 'IF_207';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Fajar Baskoro, S.Kom., MT.', 2 FROM dosen_rooms WHERE room_name = 'IF_207';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Imam Mustafa Kamal, S.ST, Ph.D.', 1 FROM dosen_rooms WHERE room_name = 'IF_208';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Eng. Muhamad Hilmil Muchtar Aditya Pradana, S.Kom, M.Sc.', 2 FROM dosen_rooms WHERE room_name = 'IF_208';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Prof. Ir. Supeno Djanali, M.Sc Ph.D.', 1 FROM dosen_rooms WHERE room_name = 'IF_209';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Prof. Ir. Handayani Tjandrasa, M.Sc., Ph.D.', 1 FROM dosen_rooms WHERE room_name = 'IF_210';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Prof. Dr. Agus Zainal Arifin, S.Kom., M.Kom.', 1 FROM dosen_rooms WHERE room_name = 'IF_211';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Ir. Suhadi Lili, M.T.I.', 2 FROM dosen_rooms WHERE room_name = 'IF_211';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Prof. Dr. Ir. Joko Lianto Buliali, M.Sc.', 1 FROM dosen_rooms WHERE room_name = 'IF_212';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Prof. Drs. Ec. Ir. Riyanarto Sarno, M.Sc., Ph.D.', 1 FROM dosen_rooms WHERE room_name = 'IF_213';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Ir. Bilqis Amaliah, S.Kom., M.Kom.', 1 FROM dosen_rooms WHERE room_name = 'IF_214';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Siska Arifiani, S.Kom., M.Kom.', 2 FROM dosen_rooms WHERE room_name = 'IF_214';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Kelly Rossa Sungkono, S.Kom., M.Kom.', 1 FROM dosen_rooms WHERE room_name = 'IF_215';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Prof. Dr. Eng. Chastine Fatichah, S.Kom., M.Kom.', 2 FROM dosen_rooms WHERE room_name = 'IF_215';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Prof. Dr. Diana Purwitasari, S.Kom., M.Sc.', 1 FROM dosen_rooms WHERE room_name = 'IF_216';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Nurul Fajrin Ariyani, S.Kom., M.Sc.', 2 FROM dosen_rooms WHERE room_name = 'IF_216';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Muhammad Alfian S.Tr.Kom., M.Tr.Kom.', 1 FROM dosen_rooms WHERE room_name = 'IF_218';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Muhammad ''Arif Faizin, S.Kom., M.Kom.', 2 FROM dosen_rooms WHERE room_name = 'IF_218';

-- ============================================================
-- Dosen room seed data (Lantai 3)
-- ============================================================

INSERT INTO dosen_rooms (room_name, type, label) VALUES
  ('Netics', 'dosen', NULL),
  ('KBJ',    'dosen', NULL),
  ('LP_2',   'dosen', NULL);

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Dr. Baskoro Adi P., S.Kom., M.Kom.', 1 FROM dosen_rooms WHERE room_name = 'Netics';
INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Hudan Studiawan, S.Kom., M.Kom., Ph.D.', 2 FROM dosen_rooms WHERE room_name = 'Netics';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Prof. Ir. Tohari Ahmad, S.Kom., M.IT., Ph.D.', 1 FROM dosen_rooms WHERE room_name = 'KBJ';

INSERT INTO dosen_occupants (room_id, name, sort_order)
  SELECT id, 'Royyana Muslim Ijtihadie, S.Kom., M.Kom., Ph.D.', 1 FROM dosen_rooms WHERE room_name = 'LP_2';
