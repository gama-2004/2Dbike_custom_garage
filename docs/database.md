# データベース テーブル定義(案)

現在のアプリにはデータベースはなく、保存した仕様はブラウザの localStorage に入れている。この文書は、設計図のクラス図にあるエンティティをもとに、データベース化する場合のテーブルを洗い出したもの。

## テーブル一覧

| No | テーブル名 | 内容 | 元のクラス |
| --- | --- | --- | --- |
| 1 | vehicles | ベース車両 | BaseVehicle |
| 2 | part_slots | 部位(タンク、マフラーなど) | PartSlot |
| 3 | parts | パーツ | Part |
| 4 | paint_slots | 塗装部位(メインカラー、フレームなど) | PaintSlot |
| 5 | palette_colors | 塗装部位ごとの色の候補 | PaintSlot.palette |
| 6 | constraints | 組み合わせ制約 | Constraint |
| 7 | build_specs | 仕様(標準仕様・プリセット・保存仕様で共通) | BuildSpec |
| 8 | build_spec_parts | 仕様の中で、各部位に付けたパーツ | BuildSpec.parts |
| 9 | build_spec_colors | 仕様の中で、各塗装部位の色 | BuildSpec.colors |
| 10 | saved_builds | 名前を付けて保存した仕様 | SavedBuild |

## 列定義

### 1. vehicles

| 列 | キー | 内容 |
| --- | --- | --- |
| id | PK | 車両ID |
| name | | 車両名 |
| genre | | supersport / american |
| wheelbase_mm | | ホイールベース(mm) |
| seat_height_mm | | 標準のシート高(mm) |
| base_weight_kg | | 標準の車両重量(kg) |
| default_spec_id | FK → build_specs | 標準仕様 |
| created_at | | 登録日時 |

### 2. part_slots

| 列 | キー | 内容 |
| --- | --- | --- |
| id | PK | 部位ID |
| vehicle_id | FK → vehicles | 車両 |
| name | | 部位名 |
| sort_order | | 表示順 |

### 3. parts

| 列 | キー | 内容 |
| --- | --- | --- |
| id | PK | パーツID |
| slot_id | FK → part_slots | 部位 |
| name | | パーツ名 |
| weight_kg | | 標準パーツとの重量差(kg) |
| price_yen | | 価格(円) |
| svg_template | | 描画データ |
| created_at | | 登録日時 |

### 4. paint_slots

| 列 | キー | 内容 |
| --- | --- | --- |
| id | PK | 塗装部位ID |
| vehicle_id | FK → vehicles | 車両 |
| name | | 塗装部位名 |
| sort_order | | 表示順 |

### 5. palette_colors

| 列 | キー | 内容 |
| --- | --- | --- |
| id | PK | 色ID |
| paint_slot_id | FK → paint_slots | 塗装部位 |
| name | | 色名(例: キャンディレッド) |
| hex | | カラーコード |
| sort_order | | 表示順 |

### 6. constraints

| 列 | キー | 内容 |
| --- | --- | --- |
| id | PK | 制約ID |
| vehicle_id | FK → vehicles | 車両 |
| type | | EXCLUDE(同時に付けられない) / REQUIRE(一緒に必要) |
| source_part_id | FK → parts | 起点のパーツ |
| target_part_id | FK → parts | 相手のパーツ |
| auto_resolve | | 違反時に自動で解決できるか |
| message | | 利用者に見せる説明文 |

### 7. build_specs

| 列 | キー | 内容 |
| --- | --- | --- |
| id | PK | 仕様ID |
| vehicle_id | FK → vehicles | 車両 |
| lower_mm | | ローダウン量(mm) |

### 8. build_spec_parts

| 列 | キー | 内容 |
| --- | --- | --- |
| spec_id | PK, FK → build_specs | 仕様 |
| slot_id | PK, FK → part_slots | 部位 |
| part_id | FK → parts | 付けたパーツ |

### 9. build_spec_colors

| 列 | キー | 内容 |
| --- | --- | --- |
| spec_id | PK, FK → build_specs | 仕様 |
| paint_slot_id | PK, FK → paint_slots | 塗装部位 |
| hex | | 色(パレット外の色も入れられるようにカラーコードで持つ) |

### 10. saved_builds

| 列 | キー | 内容 |
| --- | --- | --- |
| id | PK | 保存ID |
| name | | 保存名 |
| saved_at | | 保存日時 |
| spec_id | FK → build_specs | 仕様 |

## 設計上の判断

- **仕様は1つの形にまとめた。** 標準仕様、保存仕様、比較のビフォーは同じ形なので、build_specs と中身の2テーブルに共通化した。
- **テーブルにしないもの。** Workspace(編集中の状態)と EditCommand(取り消し用の履歴)は画面を開いている間だけ使うのでメモリ上に持つ。Catalog は全体をまとめて扱うためのクラスで、データとしての中身はない。
- **プリセット。** アプリにはあるがクラス図にはまだないため入れていない。入れるなら presets(id、vehicle_id、name、spec_id)を1つ足す。
- **ユーザー。** 保存先が各自のブラウザなので今は不要。サーバーで保存するなら users テーブルと saved_builds.user_id が必要になる。
