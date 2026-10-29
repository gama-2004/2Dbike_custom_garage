-- 2Dカスタムガレージ テーブル作成SQL(MySQL 8.4 LTS)
-- 基本設計書「8. データベース設計」と対応する。文字コードは utf8mb4。
-- server の `npm run db:init` がこのファイルを実行し、初期データ(組み込みの2車種と管理者)を入れる。

CREATE DATABASE IF NOT EXISTS custom_garage
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_ja_0900_as_cs;
USE custom_garage;

-- 1. ベース車両
CREATE TABLE T_vehicles (
  vehicle_id          INT          NOT NULL AUTO_INCREMENT COMMENT '車両ID',
  vehicle_code        VARCHAR(10)  NOT NULL COMMENT '車両コード(V001)',
  name                VARCHAR(50)  NOT NULL COMMENT '車両名',
  genre_code          CHAR(2)      NOT NULL COMMENT 'ジャンルコード(SS/AM)',
  wheelbase_mm        SMALLINT     NOT NULL COMMENT 'ホイールベース(mm)',
  seat_height_mm      SMALLINT     NOT NULL COMMENT '標準のシート高(mm)',
  ground_clearance_mm SMALLINT     NOT NULL COMMENT '標準の最低地上高(mm)',
  base_weight_kg      DECIMAL(5,1) NOT NULL COMMENT '標準の車両重量(kg)',
  lower_max_mm        TINYINT      NOT NULL DEFAULT 20 COMMENT 'ローダウン量の上限(mm)',
  renderer            VARCHAR(20)  NOT NULL DEFAULT 'template' COMMENT '描画方法(supersport/american=組み込み、template=定義ファイルのSVG)',
  base_svg            MEDIUMTEXT   NULL     COMMENT '車体の描画データ(renderer が template のとき)',
  default_spec_id     INT          NULL     COMMENT '標準仕様(T_build_specs)',
  is_active           TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '公開フラグ',
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登録日時',
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新日時',
  PRIMARY KEY (vehicle_id),
  UNIQUE KEY uq_vehicles_code (vehicle_code)
) ENGINE=InnoDB COMMENT='ベース車両';

-- 2. 部位
CREATE TABLE T_part_slots (
  slot_id    INT         NOT NULL AUTO_INCREMENT COMMENT '部位ID',
  vehicle_id INT         NOT NULL COMMENT '車両ID',
  slot_code  VARCHAR(20) NOT NULL COMMENT '部位コード(tank, exhaust など)',
  name       VARCHAR(30) NOT NULL COMMENT '部位名',
  sort_order SMALLINT    NOT NULL DEFAULT 0 COMMENT '表示順',
  PRIMARY KEY (slot_id),
  UNIQUE KEY uq_part_slots_code (vehicle_id, slot_code),
  CONSTRAINT fk_part_slots_vehicle FOREIGN KEY (vehicle_id) REFERENCES T_vehicles (vehicle_id)
) ENGINE=InnoDB COMMENT='部位';

-- 3. パーツ
CREATE TABLE T_parts (
  part_id        INT          NOT NULL AUTO_INCREMENT COMMENT 'パーツID',
  slot_id        INT          NOT NULL COMMENT '部位ID',
  part_code      VARCHAR(20)  NOT NULL COMMENT 'パーツコード(slipon など)',
  name           VARCHAR(50)  NOT NULL COMMENT 'パーツ名',
  weight_diff_kg DECIMAL(4,1) NOT NULL DEFAULT 0 COMMENT '標準パーツとの重量差(kg)',
  price_yen      INT          NULL     COMMENT '参考価格(円)',
  svg_template   MEDIUMTEXT   NOT NULL COMMENT '描画データ(SVG)。組み込みの車両の標準パーツは空',
  is_active      TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '公開フラグ',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登録日時',
  PRIMARY KEY (part_id),
  UNIQUE KEY uq_parts_code (slot_id, part_code),
  CONSTRAINT fk_parts_slot FOREIGN KEY (slot_id) REFERENCES T_part_slots (slot_id)
) ENGINE=InnoDB COMMENT='パーツ';

-- 4. 塗装部位
CREATE TABLE T_paint_slots (
  paint_slot_id INT         NOT NULL AUTO_INCREMENT COMMENT '塗装部位ID',
  vehicle_id    INT         NOT NULL COMMENT '車両ID',
  paint_code    VARCHAR(20) NOT NULL COMMENT '塗装部位コード(main, frame など)',
  name          VARCHAR(30) NOT NULL COMMENT '塗装部位名',
  sort_order    SMALLINT    NOT NULL DEFAULT 0 COMMENT '表示順',
  PRIMARY KEY (paint_slot_id),
  UNIQUE KEY uq_paint_slots_code (vehicle_id, paint_code),
  CONSTRAINT fk_paint_slots_vehicle FOREIGN KEY (vehicle_id) REFERENCES T_vehicles (vehicle_id)
) ENGINE=InnoDB COMMENT='塗装部位';

-- 5. 塗装部位の色(パレット)
CREATE TABLE T_palette_colors (
  color_id      INT         NOT NULL AUTO_INCREMENT COMMENT '色ID',
  paint_slot_id INT         NOT NULL COMMENT '塗装部位ID',
  name          VARCHAR(30) NOT NULL COMMENT '色名',
  hex           CHAR(7)     NOT NULL COMMENT 'カラーコード(#RRGGBB)',
  sort_order    SMALLINT    NOT NULL DEFAULT 0 COMMENT '表示順',
  PRIMARY KEY (color_id),
  UNIQUE KEY uq_palette_colors_hex (paint_slot_id, hex),
  CONSTRAINT fk_palette_colors_slot FOREIGN KEY (paint_slot_id) REFERENCES T_paint_slots (paint_slot_id)
) ENGINE=InnoDB COMMENT='塗装部位の色';

-- 6. 組み合わせ制約
CREATE TABLE T_constraints (
  constraint_id  INT          NOT NULL AUTO_INCREMENT COMMENT '制約ID',
  vehicle_id     INT          NOT NULL COMMENT '車両ID',
  type_code      VARCHAR(10)  NOT NULL COMMENT '制約種別コード(EXCLUDE/REQUIRE)',
  source_part_id INT          NOT NULL COMMENT '起点のパーツ',
  target_part_id INT          NOT NULL COMMENT '相手のパーツ',
  auto_resolve   TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '自動解決できるか',
  message        VARCHAR(200) NOT NULL COMMENT '利用者に見せる説明文',
  PRIMARY KEY (constraint_id),
  CONSTRAINT fk_constraints_vehicle FOREIGN KEY (vehicle_id) REFERENCES T_vehicles (vehicle_id),
  CONSTRAINT fk_constraints_source FOREIGN KEY (source_part_id) REFERENCES T_parts (part_id),
  CONSTRAINT fk_constraints_target FOREIGN KEY (target_part_id) REFERENCES T_parts (part_id),
  CONSTRAINT ck_constraints_type CHECK (type_code IN ('EXCLUDE', 'REQUIRE'))
) ENGINE=InnoDB COMMENT='組み合わせ制約';

-- 7. 仕様(標準仕様・プリセット・保存仕様で共通)
CREATE TABLE T_build_specs (
  spec_id    INT      NOT NULL AUTO_INCREMENT COMMENT '仕様ID',
  vehicle_id INT      NOT NULL COMMENT '車両ID',
  lower_mm   TINYINT  NOT NULL DEFAULT 0 COMMENT 'ローダウン量(mm)',
  number_no  TINYINT  NULL     COMMENT 'ゼッケン番号(0〜99、なしはNULL)',
  options_json JSON   NULL     COMMENT 'その他のオン・オフ(リムストライプ、ゼッケンの有無など)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '作成日時',
  PRIMARY KEY (spec_id),
  CONSTRAINT fk_build_specs_vehicle FOREIGN KEY (vehicle_id) REFERENCES T_vehicles (vehicle_id)
) ENGINE=InnoDB COMMENT='仕様';

ALTER TABLE T_vehicles
  ADD CONSTRAINT fk_vehicles_default_spec FOREIGN KEY (default_spec_id) REFERENCES T_build_specs (spec_id);

-- 8. 仕様(パーツ)
CREATE TABLE T_build_spec_parts (
  spec_id INT NOT NULL COMMENT '仕様ID',
  slot_id INT NOT NULL COMMENT '部位ID',
  part_id INT NOT NULL COMMENT '付けたパーツ',
  PRIMARY KEY (spec_id, slot_id),
  CONSTRAINT fk_spec_parts_spec FOREIGN KEY (spec_id) REFERENCES T_build_specs (spec_id) ON DELETE CASCADE,
  CONSTRAINT fk_spec_parts_slot FOREIGN KEY (slot_id) REFERENCES T_part_slots (slot_id),
  CONSTRAINT fk_spec_parts_part FOREIGN KEY (part_id) REFERENCES T_parts (part_id)
) ENGINE=InnoDB COMMENT='仕様(パーツ)';

-- 9. 仕様(塗装部位の色)
CREATE TABLE T_build_spec_colors (
  spec_id       INT     NOT NULL COMMENT '仕様ID',
  paint_slot_id INT     NOT NULL COMMENT '塗装部位ID',
  hex           CHAR(7) NOT NULL COMMENT '色(パレット外の色も入れられるようカラーコードで持つ)',
  PRIMARY KEY (spec_id, paint_slot_id),
  CONSTRAINT fk_spec_colors_spec FOREIGN KEY (spec_id) REFERENCES T_build_specs (spec_id) ON DELETE CASCADE,
  CONSTRAINT fk_spec_colors_slot FOREIGN KEY (paint_slot_id) REFERENCES T_paint_slots (paint_slot_id)
) ENGINE=InnoDB COMMENT='仕様(塗装部位の色)';

-- 10. 名前を付けて保存した仕様
CREATE TABLE T_saved_builds (
  build_id   INT         NOT NULL AUTO_INCREMENT COMMENT '保存ID',
  owner_key  CHAR(36)    NOT NULL COMMENT '利用者キー(ブラウザで発行するUUID)',
  name       VARCHAR(50) NOT NULL COMMENT '保存名',
  style_name VARCHAR(50) NOT NULL COMMENT '保存時のスタイル名',
  spec_id    INT         NOT NULL COMMENT '仕様ID',
  saved_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '保存日時',
  PRIMARY KEY (build_id),
  KEY ix_saved_builds_owner (owner_key, saved_at),
  CONSTRAINT fk_saved_builds_spec FOREIGN KEY (spec_id) REFERENCES T_build_specs (spec_id)
) ENGINE=InnoDB COMMENT='保存仕様';

-- 11. プリセット
CREATE TABLE T_presets (
  preset_id  INT         NOT NULL AUTO_INCREMENT COMMENT 'プリセットID',
  vehicle_id INT         NOT NULL COMMENT '車両ID',
  name       VARCHAR(50) NOT NULL COMMENT 'プリセット名(ボバーなど)',
  spec_id    INT         NOT NULL COMMENT '仕様ID',
  sort_order SMALLINT    NOT NULL DEFAULT 0 COMMENT '表示順',
  PRIMARY KEY (preset_id),
  CONSTRAINT fk_presets_vehicle FOREIGN KEY (vehicle_id) REFERENCES T_vehicles (vehicle_id),
  CONSTRAINT fk_presets_spec FOREIGN KEY (spec_id) REFERENCES T_build_specs (spec_id)
) ENGINE=InnoDB COMMENT='プリセット';

-- 12. 管理者
CREATE TABLE T_admins (
  admin_id      INT          NOT NULL AUTO_INCREMENT COMMENT '管理者ID',
  login_id      VARCHAR(30)  NOT NULL COMMENT 'ログインID',
  password_hash VARCHAR(100) NOT NULL COMMENT 'パスワード(bcryptでハッシュ化)',
  name          VARCHAR(30)  NOT NULL COMMENT '氏名',
  fail_count    TINYINT      NOT NULL DEFAULT 0 COMMENT '連続ログイン失敗回数',
  locked_until  DATETIME     NULL     COMMENT 'ロック解除日時',
  last_login_at DATETIME     NULL     COMMENT '最終ログイン日時',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '登録日時',
  PRIMARY KEY (admin_id),
  UNIQUE KEY uq_admins_login (login_id)
) ENGINE=InnoDB COMMENT='管理者';
