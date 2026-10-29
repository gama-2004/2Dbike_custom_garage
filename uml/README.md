# 設計図

卒業研究で扱う10機能(2-01〜2-10)の設計図。ユースケース図とクラス図は基本設計書と同じ SVG、ロバストネス図とシーケンス図は PlantUML から生成している。

- [ユースケース記述](usecases.md)
- まとめて見る場合は [design.html](design.html) をブラウザで開く(GitHub上ではソース表示になるため、ダウンロードするか GitHub Pages で開く)

## ユースケース図

![ユースケース図](svg/usecase.svg)

ユースケース記述(10件)は [usecases.md](usecases.md)。基本設計書の「5.3 ユースケース図」「5.4 ユースケース記述」と同じ内容。

## クラス図

基本設計書の「5.5 クラス図」と同じもの。各クラスの責務の表は基本設計書にある。

### エンティティ

データベースに保存するもの。属性はテーブル定義(`docs/sql/schema.sql`)の列と対応する。

![クラス図(エンティティ)](svg/class_entity.svg)

### 画面・制御・サーバー

React 版(`web/src`)とサーバー(`server/src`)の構成。灰色の箱はまだ実装していないもの。

![クラス図(画面・制御・サーバー)](svg/class_overview.svg)

## ユースケースごとの図

プロトタイプのときに作ったロバストネス図・シーケンス図(`model.py` から生成)。保存先がブラウザになっているなど、サーバー版とは違うところがある。

### 2-01 車両ベース選択

記述: [usecases.md](usecases.md#2-01-車両ベース選択)

![2-01 ロバストネス図](svg/uc2_01_robustness.svg)

![2-01 シーケンス図](svg/uc2_01_sequence.svg)

### 2-02 ベース車両追加

記述: [usecases.md](usecases.md#2-02-ベース車両追加)

![2-02 ロバストネス図](svg/uc2_02_robustness.svg)

![2-02 シーケンス図](svg/uc2_02_sequence.svg)

### 2-03 パーツ追加

記述: [usecases.md](usecases.md#2-03-パーツ追加)

![2-03 ロバストネス図](svg/uc2_03_robustness.svg)

![2-03 シーケンス図](svg/uc2_03_sequence.svg)

### 2-04 組み合わせ制約

記述: [usecases.md](usecases.md#2-04-組み合わせ制約)

![2-04 ロバストネス図](svg/uc2_04_robustness.svg)

![2-04 シーケンス図](svg/uc2_04_sequence.svg)

### 2-05 パーツ・塗装選択

記述: [usecases.md](usecases.md#2-05-パーツ塗装選択)

![2-05 ロバストネス図](svg/uc2_05_robustness.svg)

![2-05 シーケンス図](svg/uc2_05_sequence.svg)

### 2-06 取り消し

記述: [usecases.md](usecases.md#2-06-取り消し)

![2-06 ロバストネス図](svg/uc2_06_robustness.svg)

![2-06 シーケンス図](svg/uc2_06_sequence.svg)

### 2-07 ビフォーアフター比較

記述: [usecases.md](usecases.md#2-07-ビフォーアフター比較)

![2-07 ロバストネス図](svg/uc2_07_robustness.svg)

![2-07 シーケンス図](svg/uc2_07_sequence.svg)

### 2-08 仕様保存・呼出

記述: [usecases.md](usecases.md#2-08-仕様保存呼出)

![2-08 ロバストネス図](svg/uc2_08_robustness.svg)

![2-08 シーケンス図](svg/uc2_08_sequence.svg)

### 2-09 PDF保存

記述: [usecases.md](usecases.md#2-09-PDF保存)

![2-09 ロバストネス図](svg/uc2_09_robustness.svg)

![2-09 シーケンス図](svg/uc2_09_sequence.svg)

## 図の作り直し方

1. `model.py` を編集する(図の定義とユースケース記述はすべてここにある)
2. [PlantUML](https://plantuml.com/download) の `plantuml.jar` をこのフォルダに置く(Java と Graphviz が必要)
3. `python render.py` で `puml/` と `svg/` を作り直す
4. `python gen_html.py` で `design.html` を作り直す

`puml/` のファイルは astah や VS Code の PlantUML 拡張でもそのまま開ける。
