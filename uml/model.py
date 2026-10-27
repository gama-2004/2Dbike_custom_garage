# -*- coding: utf-8 -*-
"""2Dカスタムガレージ 設計モデル: PlantUMLソースとユースケース記述の定義"""

HEAD = '''@startuml
skinparam defaultFontName "Noto Sans CJK JP"
skinparam shadowing false
skinparam backgroundColor white
skinparam ArrowColor #3b4250
skinparam defaultFontSize 13
'''

# alias -> (kind, 日本語名, クラス名)
EL = {
 'CS':('boundary','カスタム画面','CustomizeScreen'),
 'BV':('boundary','車両ビュー','BikeView'),
 'CV':('boundary','比較画面','CompareView'),
 'SL':('boundary','保存一覧','SaveListPanel'),
 'AS':('boundary','管理画面','AdminScreen'),
 'PD':('boundary','PDF出力ダイアログ','PdfDialog'),
 'VS':('control','ベース選択制御','VehicleSelector'),
 'CM':('control','カタログ管理制御','CatalogManager'),
 'CC':('control','制約判定','ConstraintChecker'),
 'CU':('control','カスタム制御','CustomizeController'),
 'HM':('control','履歴管理','HistoryManager'),
 'CP':('control','比較制御','CompareController'),
 'BR':('control','保存管理','BuildRepository'),
 'PE':('control','PDF生成','PdfExporter'),
 'RD':('control','描画制御','Renderer'),
 'CA':('entity','カタログ','Catalog'),
 'VH':('entity','ベース車両','BaseVehicle'),
 'PS':('entity','部位','PartSlot'),
 'PT':('entity','パーツ','Part'),
 'PA':('entity','塗装部位','PaintSlot'),
 'CN':('entity','制約ルール','Constraint'),
 'SP':('entity','仕様','BuildSpec'),
 'WS':('entity','作業状態','Workspace'),
 'EC':('entity','変更履歴','EditCommand'),
 'SB':('entity','保存仕様','SavedBuild'),
}
ACTORS={'U':'利用者','A':'管理者'}

def decl(alias, seq=False):
    if alias in ACTORS: return f'actor "{ACTORS[alias]}" as {alias}'
    k,jp,en=EL[alias]
    return f'{k} "{jp}\\n{en}" as {alias}'

# ---------------- クラス一覧（責務） ----------------
RESP = {
 'CustomizeScreen':'車両選択、パーツ棚、ビルドシート、元に戻す・比較・PDFの各ボタンを持つメイン画面',
 'BikeView':'描画済みの車両図(SVG)を表示する',
 'CompareView':'ビフォーとアフターの図、変更部位の一覧を表示する',
 'SaveListPanel':'保存済み仕様の一覧と、保存・呼出・削除の操作を受け付ける',
 'AdminScreen':'車両・パーツの定義ファイルを受け付け、プレビューと検証結果を表示する',
 'PdfDialog':'用紙の向きなどの出力条件を受け付け、PDFを渡す',
 'VehicleSelector':'ベース車両の一覧取得と切り替え',
 'CatalogManager':'定義ファイルの読込・検証と、カタログへの登録',
 'ConstraintChecker':'組み合わせ制約の判定、選べない選択肢の算出、保存仕様の整合性確認',
 'CustomizeController':'パーツ・塗装・プリセットの変更を受けて、仕様の更新を進める',
 'HistoryManager':'変更履歴のスタックを持ち、取り消し・やり直しを行う',
 'CompareController':'標準仕様と現在の仕様の差分を求め、比較画面を出す',
 'BuildRepository':'仕様をブラウザの保存領域に読み書きする',
 'PdfExporter':'図とビルドシートからPDFを組み立てる',
 'Renderer':'仕様とパーツの描画データから車両図(SVG)を作る',
 'Catalog':'登録済みのベース車両とパーツの集まり',
 'BaseVehicle':'ベース車両。部位・塗装部位・制約・標準仕様を持つ',
 'PartSlot':'タンク、マフラーなどの部位',
 'Part':'部位に取り付けるパーツ。重量・価格・描画データを持つ',
 'PaintSlot':'メインカラーなど色を塗り分ける部位と、その色の候補',
 'Constraint':'同時に付けられない／一緒に必要、などの組み合わせルール',
 'BuildSpec':'どの部位にどのパーツ・色を付けたかを表す仕様',
 'Workspace':'いま編集中の車両と仕様',
 'EditCommand':'1回分の変更（変更前と変更後の仕様）',
 'SavedBuild':'名前と保存日時を付けて保存した仕様',
}

CLASS = HEAD + r'''
skinparam linetype ortho
skinparam nodesep 40
skinparam ranksep 60
skinparam class {
  BackgroundColor<<boundary>> #eef3ff
  BackgroundColor<<control>> #fff6e5
  BackgroundColor<<entity>> #eaf6ee
  BorderColor #3b4250
}
hide empty members
title 2Dカスタムガレージ クラス図

package "バウンダリ" {
class CustomizeScreen <<boundary>> {
  +showBaseList(vehicles)
  +buildShelf(slots)
  +disableOptions(options)
  +updateSheet(specs)
  +updateButtons(canUndo, canRedo)
  +showEditor()
  +showMessage(text)
  +confirmDiscard() : boolean
}
class BikeView <<boundary>> {
  +display(svg)
}
class CompareView <<boundary>> {
  +show(beforeSvg, afterSvg, diffs)
  +setSlider(ratio)
}
class SaveListPanel <<boundary>> {
  +showList(builds)
  +showMessage(text)
}
class AdminScreen <<boundary>> {
  +showPreview(svg)
  +showErrors(errors)
  +showResult(text)
}
class PdfDialog <<boundary>> {
  +open()
  +download(blob, fileName)
  +showError(text)
}
}

package "コントロール" {
class VehicleSelector <<control>> {
  +listVehicles() : BaseVehicle[]
  +selectVehicle(id) : BaseVehicle
}
class CatalogManager <<control>> {
  +importVehicle(file) : ValidationResult
  +importPart(vehicleId, file) : ValidationResult
  +commit()
  -parse(file)
  -validate(def)
}
class ConstraintChecker <<control>> {
  +check(spec, slotId, partId) : CheckResult
  +getDisabledOptions(spec) : Option[]
  +validate(spec) : BuildSpec
}
class CustomizeController <<control>> {
  +changePart(slotId, partId)
  +changeColor(paintSlotId, color)
  +applyPreset(presetId)
}
class HistoryManager <<control>> {
  -undoStack : EditCommand[]
  -redoStack : EditCommand[]
  +push(cmd)
  +undo()
  +redo()
  +clear()
  +canUndo() : boolean
  +canRedo() : boolean
}
class CompareController <<control>> {
  +startCompare()
  +endCompare()
  -diff(before, after) : Diff[]
}
class BuildRepository <<control>> {
  +save(name)
  +load(id)
  +list() : SavedBuild[]
  +delete(id)
  -writeStorage()
  -readStorage(id)
}
class PdfExporter <<control>> {
  +requestExport()
  +export(options)
  -svgToImage(svg)
  -buildPdf() : Blob
}
class Renderer <<control>> {
  +render()
  +renderSvg(spec) : string
  +renderPreview(target) : string
}
}

package "エンティティ" {
class Catalog <<entity>> {
  +getVehicles() : BaseVehicle[]
  +findVehicle(id) : BaseVehicle
  +findPart(id) : Part
  +exists(id) : boolean
  +register(item)
}
class BaseVehicle <<entity>> {
  -id : string
  -name : string
  -wheelbase : number
  +getDefaultSpec() : BuildSpec
  +getConstraints() : Constraint[]
}
class PartSlot <<entity>> {
  -id : string
  -name : string
}
class Part <<entity>> {
  -id : string
  -name : string
  -weight : number
  -price : number
  -svgTemplate : string
  +getSvgTemplate() : string
  +getWeight() : number
  +getInfo()
}
class PaintSlot <<entity>> {
  -id : string
  -name : string
  -palette : Color[]
}
class Constraint <<entity>> {
  -type : EXCLUDE | REQUIRE
  -sourcePartId : string
  -targetPartId : string
  -autoResolve : boolean
  -message : string
  +isViolatedBy(spec) : boolean
}
class BuildSpec <<entity>> {
  -vehicleId : string
  -parts : Map<slotId, partId>
  -colors : Map<paintSlotId, Color>
  -lowerAmount : number
  +withPart(slotId, partId) : BuildSpec
  +withColor(paintSlotId, color) : BuildSpec
  +clone() : BuildSpec
  +calcSpecs()
}
class Workspace <<entity>> {
  -vehicle : BaseVehicle
  -current : BuildSpec
  +getCurrent() : BuildSpec
  +setCurrent(spec)
}
class EditCommand <<entity>> {
  -before : BuildSpec
  -after : BuildSpec
  +getBefore() : BuildSpec
  +getAfter() : BuildSpec
}
class SavedBuild <<entity>> {
  -id : string
  -name : string
  -savedAt : Date
  -spec : BuildSpec
  +getSpec() : BuildSpec
}
}

CustomizeScreen --> VehicleSelector
CustomizeScreen --> CustomizeController
CustomizeScreen --> HistoryManager
CustomizeScreen --> CompareController
CustomizeScreen --> PdfExporter
SaveListPanel --> BuildRepository
AdminScreen --> CatalogManager
PdfDialog --> PdfExporter
CompareView --> CompareController

CustomizeController --> ConstraintChecker
CustomizeController --> HistoryManager
CustomizeController --> Renderer
BuildRepository --> ConstraintChecker
BuildRepository --> VehicleSelector
CatalogManager --> Renderer
CompareController --> Renderer
PdfExporter --> Renderer
Renderer --> BikeView
CompareController --> CompareView

VehicleSelector --> Catalog
CatalogManager --> Catalog
ConstraintChecker --> Constraint
CustomizeController --> Workspace
HistoryManager "1" o-- "0..*" EditCommand
BuildRepository "1" --> "0..*" SavedBuild
Renderer --> Workspace

Catalog "1" *-- "1..*" BaseVehicle
BaseVehicle "1" *-- "1..*" PartSlot
PartSlot "1" *-- "1..*" Part
BaseVehicle "1" *-- "1..*" PaintSlot
BaseVehicle "1" *-- "0..*" Constraint
Workspace "1" --> "1" BuildSpec : current
EditCommand --> "2" BuildSpec : before/after
SavedBuild "1" *-- "1" BuildSpec
BuildSpec --> BaseVehicle
@enduml
'''

USECASE = HEAD + r'''
left to right direction
skinparam usecase {
  BackgroundColor #f4f6fa
  BorderColor #3b4250
}
title 2Dカスタムガレージ ユースケース図
actor "利用者" as U
actor "管理者" as A
rectangle "2Dカスタムガレージ" {
  usecase "2-01 車両ベース選択" as UC01
  usecase "2-05 パーツ・塗装選択" as UC05
  usecase "2-04 組み合わせ制約" as UC04
  usecase "2-06 取り消し" as UC06
  usecase "2-07 ビフォーアフター比較" as UC07
  usecase "2-08 仕様保存・呼出" as UC08
  usecase "2-09 PDF保存" as UC09
  usecase "2-02 ベース車両追加" as UC02
  usecase "2-03 パーツ追加" as UC03
}
U -- UC01
U -- UC05
U -- UC06
U -- UC07
U -- UC08
U -- UC09
UC02 -- A
UC03 -- A
UC05 ..> UC04 : <<include>>
UC08 ..> UC04 : <<include>>
@enduml
'''

def robust(title, nodes, edges, actor='U'):
    s = HEAD + 'left to right direction\nskinparam nodesep 30\nskinparam ranksep 70\n'
    s += f'title {title} ロバストネス図\n'
    s += decl(actor) + '\n'
    for n in nodes: s += decl(n) + '\n'
    for a,b,l in edges:
        arrow = '--' if a in ACTORS else '-->'
        s += f'{a} {arrow} {b} : {l}\n'
    return s + '@enduml\n'

def seq(title, actors, parts, body):
    s = HEAD + 'skinparam sequenceMessageAlign left\nskinparam responseMessageBelowArrow true\nautonumber\nhide footbox\n'
    s += f'title {title} シーケンス図\n'
    for a in actors: s += decl(a) + '\n'
    for p in parts: s += decl(p) + '\n'
    return s + body.strip() + '\n@enduml\n'

UCS = []
def uc(**k): UCS.append(k)

# ---------------- 2-01 ----------------
uc(id='2-01', name='車両ベース選択', actor='利用者',
 summary='カスタムの土台にするベース車両を一覧から選び、その標準仕様を車両ビューに表示する。',
 pre='カタログに1台以上のベース車両が登録されている。',
 post='選んだ車両の標準仕様が作業状態に設定され、車両ビューとパーツ棚がその車両の内容になる。変更履歴は空になる。',
 main=['利用者はカスタム画面を開く。','システムはカタログから車両一覧を取得し、表示する。','利用者は車両を選ぶ。',
       'システムは車両の標準仕様の複製を、作業状態の現在の仕様に設定する。','システムは変更履歴を消去する。',
       'システムは車両図を描画して車両ビューに表示し、パーツ棚をその車両の部位で組み立て直す。'],
 alt=['3a. 未保存の変更がある場合、システムは「現在の仕様は破棄されます」と確認する。利用者が取り消すと3に戻る。'],
 exc=['2a. 車両が1台も登録されていない場合、システムは「車両が登録されていません」と表示して終了する。'],
 robust=robust('2-01 車両ベース選択',['CS','VS','CA','VH','WS','HM','EC','RD','PT','BV'],[
   ('U','CS','1 画面を開く／3 車両を選ぶ'),('CS','VS','2 一覧要求／3 選択通知'),('VS','CA','2 一覧取得'),
   ('VS','VH','4 標準仕様取得'),('VS','WS','4 現在の仕様に設定'),('VS','HM','5 履歴消去'),('HM','EC','5 削除'),
   ('VS','RD','6 描画要求'),('RD','WS','6 仕様取得'),('RD','PT','6 描画データ取得'),('RD','BV','6 表示'),('VS','CS','6 パーツ棚を再構成')]),
 seq=seq('2-01 車両ベース選択',['U'],['CS','VS','HM','RD','BV','CA','VH','WS','PT'],r'''
U -> CS : 画面を開く
activate CS
CS -> VS : listVehicles()
activate VS
VS -> CA : getVehicles()
CA --> VS : vehicles
VS --> CS : vehicles
deactivate VS
CS -> CS : showBaseList(vehicles)
U -> CS : 車両を選ぶ
opt 未保存の変更がある
  CS -> CS : confirmDiscard()
end
CS -> VS : selectVehicle(id)
activate VS
VS -> CA : findVehicle(id)
CA --> VS : vehicle
VS -> VH : getDefaultSpec()
VH --> VS : spec
VS -> WS : setCurrent(spec.clone())
VS -> HM : clear()
VS -> RD : render()
activate RD
RD -> WS : getCurrent()
WS --> RD : spec
loop 各部位
  RD -> PT : getSvgTemplate()
  PT --> RD : template
end
RD -> BV : display(svg)
deactivate RD
VS --> CS : vehicle
deactivate VS
CS -> CS : buildShelf(vehicle.slots)
deactivate CS
'''))

# ---------------- 2-02 ----------------
uc(id='2-02', name='ベース車両追加', actor='管理者',
 summary='管理者が車両定義ファイル(JSON)を読み込み、新しいベース車両をカタログに登録する。定義ファイルには部位、塗装部位、標準仕様、描画データを含む。',
 pre='管理者が管理画面を開いている。',
 post='新しい車両がカタログに登録され、2-01の車両一覧に表示される。',
 main=['管理者は「車両を追加」を選び、車両定義ファイルを指定する。','システムはファイルを読み込み、内容を検証する(必須項目、部位IDの重複、標準仕様がすべての部位を満たしているか)。',
       'システムは同じIDの車両がないか確認し、車両を生成する。','システムは標準仕様で車両図を描画し、プレビューとして表示する。','管理者は登録を確定する。',
       'システムは車両をカタログに登録する。','システムは「登録しました」と表示する。'],
 alt=['5a. 管理者が取り消した場合、システムは何も登録せずに終了する。'],
 exc=['2a. 検証エラーがある場合、システムはエラーの項目と理由を一覧で表示し、登録しない。','3a. 同じIDの車両がある場合、システムは上書きするかを確認する。'],
 robust=robust('2-02 ベース車両追加',['AS','CM','CA','VH','RD'],[
   ('A','AS','1 定義ファイルを指定／5 確定'),('AS','CM','1 読込要求／5 確定'),('CM','CA','3 ID重複確認／6 登録'),
   ('CM','VH','3 車両を生成'),('CM','RD','4 プレビュー描画'),('RD','AS','4 プレビュー表示'),('CM','AS','2a エラー表示／7 結果表示')],actor='A'),
 seq=seq('2-02 ベース車両追加',['A'],['AS','CM','RD','CA','VH'],r'''
A -> AS : 定義ファイルを指定
activate AS
AS -> CM : importVehicle(file)
activate CM
CM -> CM : parse(file)
CM -> CM : validate(def)
alt 検証エラー
  CM --> AS : ValidationResult(errors)
  AS -> AS : showErrors(errors)
else 正常
  CM -> CA : exists(def.id)
  CA --> CM : false
  create VH
  CM -> VH : new BaseVehicle(def)
  CM -> RD : renderPreview(vehicle)
  activate RD
  RD --> CM : svg
  deactivate RD
  CM --> AS : ValidationResult(ok)
  AS -> AS : showPreview(svg)
  A -> AS : 登録を確定
  AS -> CM : commit()
  CM -> CA : register(vehicle)
  CM --> AS : 完了
  AS -> AS : showResult("登録しました")
end
deactivate CM
deactivate AS
'''))

# ---------------- 2-03 ----------------
uc(id='2-03', name='パーツ追加', actor='管理者',
 summary='登録済みの車両に、新しいパーツ(名称、重量、価格、描画データ)と、そのパーツに関わる組み合わせ制約を追加する。',
 pre='対象のベース車両がカタログに登録されている。',
 post='パーツと制約がカタログに登録され、利用者のパーツ棚に選択肢として表示される。',
 main=['管理者は対象の車両と部位を選び、パーツ定義ファイルを指定する。','システムはファイルを読み込み、内容を検証する(必須項目、部位の存在、描画データの形式)。',
       'システムはパーツを生成する。定義に制約が含まれていれば、参照先のパーツが存在するか確認して制約を生成する。','システムは標準仕様にこのパーツを付けた車両図を描画し、プレビューとして表示する。',
       '管理者は登録を確定する。','システムはパーツと制約をカタログに登録する。','システムは「登録しました」と表示する。'],
 alt=['1a. 新しい部位を追加する場合、管理者は部位名を入力する。システムは部位を作成してから2へ進む。','5a. 管理者が取り消した場合、何も登録せずに終了する。'],
 exc=['2a. 検証エラーがある場合、システムはエラーの項目と理由を表示し、登録しない。','3a. 制約の参照先パーツが存在しない場合、システムはエラーを表示し、登録しない。'],
 robust=robust('2-03 パーツ追加',['AS','CM','CA','PS','PT','CN','RD'],[
   ('A','AS','1 定義ファイルを指定／5 確定'),('AS','CM','1 読込要求／5 確定'),('CM','CA','2 対象車両を検索／3 参照先確認／6 登録'),
   ('CM','PS','1a 部位を作成'),('CM','PT','3 パーツを生成'),('CM','CN','3 制約を生成'),('CM','RD','4 プレビュー描画'),
   ('RD','AS','4 プレビュー表示'),('CM','AS','2a,3a エラー表示／7 結果表示')],actor='A'),
 seq=seq('2-03 パーツ追加',['A'],['AS','CM','RD','CA','PS','PT','CN'],r'''
A -> AS : 車両・部位を選び定義ファイルを指定
activate AS
AS -> CM : importPart(vehicleId, file)
activate CM
CM -> CA : findVehicle(vehicleId)
CA --> CM : vehicle
CM -> CM : parse(file)
CM -> CM : validate(def)
alt 検証エラー
  CM --> AS : ValidationResult(errors)
  AS -> AS : showErrors(errors)
else 正常
  opt 新しい部位
    create PS
    CM -> PS : new PartSlot(name)
  end
  create PT
  CM -> PT : new Part(def)
  loop 定義内の制約
    CM -> CA : findPart(targetPartId)
    CA --> CM : part
    create CN
    CM -> CN : new Constraint(rule)
  end
  CM -> RD : renderPreview(part)
  activate RD
  RD --> CM : svg
  deactivate RD
  CM --> AS : ValidationResult(ok)
  AS -> AS : showPreview(svg)
  A -> AS : 登録を確定
  AS -> CM : commit()
  CM -> CA : register(part, constraints)
  CM --> AS : 完了
  AS -> AS : showResult("登録しました")
end
deactivate CM
deactivate AS
'''))

# ---------------- 2-04 ----------------
uc(id='2-04', name='組み合わせ制約', actor='利用者(2-05、2-08から包含)',
 summary='パーツを変更するとき、その組み合わせが制約ルールに違反しないかを判定する。違反する選択肢は選べない状態にし、理由を示す。',
 pre='2-05でパーツの変更が要求された、または2-08で保存仕様が呼び出された。',
 post='違反がなければ変更が許可される。新しい仕様で選べなくなった選択肢は、パーツ棚で無効になり、理由が表示される。',
 main=['システムは現在の仕様に変更を加えた、仮の仕様を作る。','システムは車両の制約ルールをすべて評価する。','違反がなければ、システムは変更を許可する。',
       'システムは仮の仕様で選べなくなる選択肢を求め、パーツ棚で無効にする。理由はその選択肢に表示する。'],
 alt=['3a. 排他ルールに違反し、そのルールが自動解決できる場合(例: ネイキッド化するとスクリーンを外す)、システムは相手のパーツを外した仕様で許可し、その旨を通知する。'],
 exc=['3b. 自動解決できない違反がある場合、システムは変更を許可せず、ルールの説明文を表示する。'],
 robust=robust('2-04 組み合わせ制約',['CS','CU','CC','WS','SP','VH','CN'],[
   ('U','CS','パーツを選ぶ(2-05)'),('CS','CU','変更要求'),('CU','CC','1 判定要求／3 結果を受け取る'),('CC','WS','1 現在の仕様取得'),
   ('CC','SP','1 仮の仕様を作成'),('CC','VH','2 ルール一覧取得'),('CC','CN','2 ルールを評価'),('CC','CS','4 選択肢を無効化／3b 理由表示')]),
 seq=seq('2-04 組み合わせ制約',[],['CS','CU','CC','SP','VH','CN'],r'''
[-> CU : changePart(slotId, partId)\n(2-05から)
activate CU
CU -> CC : check(spec, slotId, partId)
activate CC
CC -> SP : withPart(slotId, partId)
SP --> CC : candidate
CC -> VH : getConstraints()
VH --> CC : constraints
loop 各ルール
  CC -> CN : isViolatedBy(candidate)
  CN --> CC : 結果
end
alt 違反なし
  CC --> CU : CheckResult(ok, candidate)
else 自動解決できる違反
  CC -> SP : withPart(targetSlotId, null)
  SP --> CC : adjusted
  CC --> CU : CheckResult(ok, adjusted, message)
else 自動解決できない違反
  CC --> CU : CheckResult(ng, message)
end
deactivate CC
CU -> CC : getDisabledOptions(newSpec)
activate CC
CC --> CU : options
deactivate CC
CU -> CS : disableOptions(options)
deactivate CU
'''))

# ---------------- 2-05 ----------------
uc(id='2-05', name='パーツ・塗装選択', actor='利用者',
 summary='部位ごとのパーツや塗装の色を選び、車両ビューとビルドシートにすぐ反映する。',
 pre='2-01でベース車両が選ばれている。',
 post='現在の仕様が更新され、変更が履歴に1件積まれる。車両ビューとビルドシート(重量、シート高など)が更新される。',
 main=['利用者はパーツ棚、または車両ビューの部位をクリックして、パーツを選ぶ。','システムは組み合わせ制約を判定する(2-04を包含)。',
       'システムは変更前と変更後の仕様を、変更履歴として記録する。','システムは現在の仕様を変更後の仕様にする。',
       'システムは車両図を描画し直し、ビルドシートの値を計算し直して表示する。'],
 alt=['1a. 塗装の色を選んだ場合、システムは制約判定をせずに3へ進む。','1b. 候補にない色を使う場合、利用者はカラーピッカーで色を指定する。',
      '1c. プリセットを選んだ場合、システムは複数の部位をまとめて変更し、変更履歴には1件として記録する。'],
 exc=['2a. 制約に違反した場合、システムは2-04の結果(理由)を表示し、仕様を変更しない。'],
 robust=robust('2-05 パーツ・塗装選択',['CS','CU','CC','HM','EC','WS','RD','PT','BV','SP'],[
   ('U','CS','1 パーツ・色を選ぶ'),('CS','CU','1 変更要求'),('CU','CC','2 制約判定(2-04)'),('CU','HM','3 履歴に記録'),('HM','EC','3 生成・保持'),
   ('CU','WS','4 仕様を更新'),('CU','RD','5 再描画'),('RD','PT','5 描画データ取得'),('RD','BV','5 表示'),('CU','SP','5 諸元計算'),('CU','CS','5 ビルドシート更新／2a 理由表示')]),
 seq=seq('2-05 パーツ・塗装選択',['U'],['CS','BV','CU','CC','HM','RD','WS','EC','SP'],r'''
U -> CS : パーツを選ぶ
activate CS
CS -> CU : changePart(slotId, partId)
activate CU
CU -> WS : getCurrent()
WS --> CU : before
CU -> CC : check(before, slotId, partId)
ref over CC : 2-04 組み合わせ制約
CC --> CU : CheckResult
alt 違反あり(ng)
  CU -> CS : showMessage(reason)
else 許可(ok)
  create EC
  CU -> EC : new EditCommand(before, after)
  CU -> HM : push(cmd)
  CU -> WS : setCurrent(after)
  CU -> RD : render()
  activate RD
  RD -> BV : display(svg)
  deactivate RD
  CU -> SP : calcSpecs()
  SP --> CU : specs
  CU -> CS : updateSheet(specs)
  CU -> CS : updateButtons(canUndo, canRedo)
end
deactivate CU
deactivate CS
'''))

# ---------------- 2-06 ----------------
uc(id='2-06', name='取り消し', actor='利用者',
 summary='直前の変更を取り消す。取り消した変更はやり直すこともできる。',
 pre='変更履歴が1件以上ある(元に戻すボタンが有効)。',
 post='仕様が1つ前の状態に戻り、車両ビューとビルドシートが更新される。取り消した変更はやり直し用に残る。',
 main=['利用者は「元に戻す」を押す(またはCtrl+Z)。','システムは取り消し用の履歴から直前の変更を取り出す。','システムは変更前の仕様を現在の仕様にする。',
       'システムは取り出した変更を、やり直し用の履歴に移す。','システムは車両図とビルドシートを更新し、ボタンの有効・無効を切り替える。'],
 alt=['1a. 利用者が「やり直す」を押した場合(Ctrl+Shift+Z)、システムはやり直し用の履歴から変更を取り出し、変更後の仕様を現在の仕様にして、取り消し用の履歴に戻す。',
      '補足. 新しい変更(2-05)を行うと、やり直し用の履歴は空になる。'],
 exc=['2a. 履歴が空の場合、ボタンは無効になっているため、この操作は行えない。'],
 robust=robust('2-06 取り消し',['CS','HM','EC','WS','RD','BV'],[
   ('U','CS','1 元に戻す／1a やり直す'),('CS','HM','1 取り消し要求'),('HM','EC','2 直前の変更を取り出す'),('HM','WS','3 変更前の仕様を適用'),
   ('HM','RD','5 再描画'),('RD','BV','5 表示'),('HM','CS','5 ボタン状態更新')]),
 seq=seq('2-06 取り消し',['U'],['CS','BV','HM','RD','EC','WS'],r'''
U -> CS : 元に戻す
activate CS
CS -> HM : undo()
activate HM
HM -> HM : cmd = undoStack.pop()
HM -> EC : getBefore()
EC --> HM : before
HM -> WS : setCurrent(before)
HM -> HM : redoStack.push(cmd)
HM -> RD : render()
activate RD
RD -> BV : display(svg)
deactivate RD
HM --> CS : canUndo(), canRedo()
deactivate HM
CS -> CS : updateButtons(canUndo, canRedo)
deactivate CS
note over CS, HM : やり直す(redo)は、redoStackから取り出して\ngetAfter()を適用し、undoStackへ戻す
'''))

# ---------------- 2-07 ----------------
uc(id='2-07', name='ビフォーアフター比較', actor='利用者',
 summary='ベース車両の標準仕様(ビフォー)と、現在の仕様(アフター)を並べて比較する。変更した部位と重量の差も一覧で示す。',
 pre='2-01でベース車両が選ばれている。',
 post='比較を閉じると編集画面に戻る。比較によって仕様は変わらない。',
 main=['利用者は「比較」を押す。','システムは現在の仕様と、車両の標準仕様を取得する。','システムは両方の車両図を描画する。',
       'システムは2つの仕様の差分(部位、変更前、変更後、重量差)を求める。','システムは2つの図を左右に並べ、差分の一覧と一緒に比較画面に表示する。','利用者は比較画面を閉じる。システムは編集画面に戻る。'],
 alt=['2a. 利用者が保存一覧から比較相手を選んだ場合、システムは標準仕様の代わりにその保存仕様をビフォーとして使う。',
      '5a. 利用者が「重ねて表示」を選んだ場合、システムは2つの図を重ね、スライダーで境目を動かして比べられるようにする。'],
 exc=['4a. 差分がない場合、システムは「ノーマルから変更はありません」と表示する。'],
 robust=robust('2-07 ビフォーアフター比較',['CS','CP','WS','VH','RD','PT','CV'],[
   ('U','CS','1 比較を押す'),('CS','CP','1 比較要求'),('CP','WS','2 現在の仕様取得'),('CP','VH','2 標準仕様取得'),
   ('CP','RD','3 両方を描画'),('CP','PT','4 重量差を計算'),('CP','CV','5 図と差分を表示'),('U','CV','5a スライダー操作／6 閉じる'),
   ('CV','CP','6 終了'),('CP','CS','6 編集画面に戻す')]),
 seq=seq('2-07 ビフォーアフター比較',['U'],['CS','CV','CP','RD','WS','VH','PT'],r'''
U -> CS : 比較を押す
activate CS
CS -> CP : startCompare()
activate CP
CP -> WS : getCurrent()
WS --> CP : after
CP -> VH : getDefaultSpec()
VH --> CP : before
CP -> RD : renderSvg(before)
RD --> CP : beforeSvg
CP -> RD : renderSvg(after)
RD --> CP : afterSvg
CP -> CP : diff(before, after)
loop 変更された部位
  CP -> PT : getWeight()
  PT --> CP : weight
end
CP -> CV : show(beforeSvg, afterSvg, diffs)
deactivate CP
deactivate CS
activate CV
opt 重ねて表示
  U -> CV : スライダーを動かす
  CV -> CV : setSlider(ratio)
end
U -> CV : 閉じる
CV -> CP : endCompare()
deactivate CV
activate CP
CP -> CS : showEditor()
deactivate CP
'''))

# ---------------- 2-08 ----------------
uc(id='2-08', name='仕様保存・呼出', actor='利用者',
 summary='現在の仕様に名前を付けてブラウザに保存し、あとで一覧から呼び出す。不要になった仕様は削除できる。',
 pre='保存: 2-01でベース車両が選ばれている。呼出: 保存済みの仕様が1件以上ある。',
 post='保存: 保存一覧に1件追加される。呼出: 選んだ仕様が現在の仕様になり、車両ビューに表示される。',
 main=['【保存】利用者は名前を入力して「保存」を押す(省略時は「ビルド #番号」)。','システムは現在の仕様を取得し、名前と保存日時を付けて保存仕様を作る。',
       'システムは保存仕様をブラウザの保存領域に書き込む。','システムは保存一覧を更新する。'],
 alt=['【呼出】A1. 利用者は保存一覧から仕様を選ぶ。','A2. システムは保存領域から保存仕様を読み込む。','A3. 車両が現在と異なる場合、システムは車両を切り替える(2-01の4〜6)。',
      'A4. システムは組み合わせ制約で整合性を確認する(2-04を包含)。','A5. システムは仕様を現在の仕様にし、変更履歴を消去する。','A6. システムは車両図とビルドシートを更新する。',
      '【削除】D1. 利用者は一覧の削除ボタンを押し、確認に答える。システムは保存領域から削除して一覧を更新する。'],
 exc=['3a. 保存領域が使えない、または容量を超えた場合、システムは「保存できませんでした」と理由を表示する。',
      'A4a. 登録が消えたパーツを含む場合、システムはその部位を標準パーツに置き換え、置き換えた部位を通知する。'],
 robust=robust('2-08 仕様保存・呼出',['SL','BR','WS','SB','VS','CC','HM','RD','BV'],[
   ('U','SL','1 保存／A1 選ぶ'),('SL','BR','1 保存要求／A1 呼出要求'),('BR','WS','2 現在の仕様取得／A5 仕様を設定'),('BR','SB','2 生成・3 書き込み／A2 読み込み'),
   ('BR','SL','4 一覧更新／3a エラー表示'),('BR','VS','A3 車両切替'),('BR','CC','A4 整合性確認'),('BR','HM','A5 履歴消去'),('BR','RD','A6 再描画'),('RD','BV','A6 表示')]),
 seq=seq('2-08 仕様保存・呼出',['U'],['SL','BV','BR','VS','CC','HM','RD','WS','SB'],r'''
group 保存
U -> SL : 名前を入力して保存
activate SL
SL -> BR : save(name)
activate BR
BR -> WS : getCurrent()
WS --> BR : spec
create SB
BR -> SB : new SavedBuild(name, now, spec)
BR -> BR : writeStorage()
alt 書き込み失敗
  BR --> SL : error
  SL -> SL : showMessage("保存できませんでした")
else 成功
  BR --> SL : builds
  SL -> SL : showList(builds)
end
deactivate BR
deactivate SL
end
group 呼出
U -> SL : 一覧から選ぶ
activate SL
SL -> BR : load(id)
activate BR
BR -> BR : readStorage(id)
BR -> SB : getSpec()
SB --> BR : saved.spec
opt 車両が現在と異なる
  BR -> VS : selectVehicle(saved.vehicleId)
end
BR -> CC : validate(saved.spec)
CC --> BR : spec(置き換え後)
BR -> WS : setCurrent(spec)
BR -> HM : clear()
BR -> RD : render()
activate RD
RD -> BV : display(svg)
deactivate RD
deactivate BR
deactivate SL
end
'''))

# ---------------- 2-09 ----------------
uc(id='2-09', name='PDF保存', actor='利用者',
 summary='完成した車両図とビルドシート(部品、色、諸元)を、1枚のPDFにして端末に保存する。',
 pre='2-01でベース車両が選ばれている。',
 post='PDFファイルが利用者の端末に保存される。仕様は変わらない。',
 main=['利用者は「PDF保存」を押す。','システムは出力ダイアログを表示する(用紙の向き、ビフォー図を含めるか)。','利用者は条件を選び、「出力」を押す。',
       'システムは現在の仕様で車両図を描画し、画像に変換する。','システムはパーツ情報から部品表、色、諸元(重量、シート高)の表を作る。',
       'システムはタイトル、日時、図、表を配置したPDFを作る。','システムは「スタイル名_日付.pdf」という名前でPDFを渡す。'],
 alt=['3a. 「ビフォー図を含める」を選んだ場合、システムは標準仕様の図も描画し、並べて配置する。'],
 exc=['6a. PDFの作成に失敗した場合(日本語フォントが読み込めないなど)、システムはエラーを表示する。','7a. ブラウザがダウンロードを許可しない場合、システムはPDFを新しいタブで開く。'],
 robust=robust('2-09 PDF保存',['CS','PE','PD','WS','VH','RD','PT'],[
   ('U','CS','1 PDF保存を押す'),('CS','PE','1 出力要求'),('PE','PD','2 ダイアログ表示／7 PDFを渡す／6a エラー表示'),('U','PD','3 条件を選び出力'),
   ('PD','PE','3 出力指示'),('PE','WS','4 仕様取得'),('PE','RD','4 図を生成'),('PE','VH','3a 標準仕様取得'),('PE','PT','5 部品情報取得')]),
 seq=seq('2-09 PDF保存',['U'],['CS','PD','PE','RD','WS','VH','PT'],r'''
U -> CS : PDF保存を押す
activate CS
CS -> PE : requestExport()
deactivate CS
activate PE
PE -> PD : open()
deactivate PE
activate PD
U -> PD : 条件を選び出力
PD -> PE : export(options)
activate PE
PE -> WS : getCurrent()
WS --> PE : spec
PE -> RD : renderSvg(spec)
RD --> PE : svg
PE -> PE : svgToImage(svg)
opt ビフォー図を含める
  PE -> VH : getDefaultSpec()
  VH --> PE : before
  PE -> RD : renderSvg(before)
  RD --> PE : beforeSvg
end
loop 各部位
  PE -> PT : getInfo()
  PT --> PE : 名称・重量・価格
end
PE -> PE : buildPdf()
alt 成功
  PE -> PD : download(blob, fileName)
else 失敗
  PE -> PD : showError(text)
end
deactivate PE
deactivate PD
'''))
