# Changelog

## [3.3.0](https://github.com/CatFoxVoyager/MermaidStudio/compare/mermaid-studio-v3.2.0...mermaid-studio-v3.3.0) (2026-11-27)


### Features

* **modals:** show Android app in About and real release notes ([68d243d](https://github.com/CatFoxVoyager/MermaidStudio/commit/68d243deaada548ee4e7a84c11da18ec526227f5))
* **ui-scale:** add 10-200% slider and 12 presets in scale menu ([32635a1](https://github.com/CatFoxVoyager/MermaidStudio/commit/32635a145ab19e4dbc1a3a7ea07e7ae6efa13d26))

## [3.2.0](https://github.com/CatFoxVoyager/MermaidStudio/compare/mermaid-studio-v3.1.0...mermaid-studio-v3.2.0) (2026-11-24)


### Features

* **app:** route diagram creation through the naming dialog ([59c46c6](https://github.com/CatFoxVoyager/MermaidStudio/commit/59c46c61fff5efdbbd6f93e3fd69d11d9a6f67db))
* **hooks:** stage diagram creation behind a naming draft ([d353924](https://github.com/CatFoxVoyager/MermaidStudio/commit/d35392422d8357fbc329686486d10d1c60e57bbd))
* **i18n:** add new-diagram naming dialog strings ([1c1dcf8](https://github.com/CatFoxVoyager/MermaidStudio/commit/1c1dcf83a71de95e634960b5a986f6aa3dfb1e96))
* **modals:** add the new-diagram naming dialog ([2c22ba7](https://github.com/CatFoxVoyager/MermaidStudio/commit/2c22ba700081c00b4bf2d158f2209c31d1721347))
* **ui-scale:** add Alt/Ctrl scale shortcuts, active while typing ([94c1df0](https://github.com/CatFoxVoyager/MermaidStudio/commit/94c1df08ea2db44a6aef4031fcc62301e68c2088))
* **ui-scale:** add scale rule and screen-to-local helpers ([e67d5a6](https://github.com/CatFoxVoyager/MermaidStudio/commit/e67d5a6a60f8496c074dd4d1f1a187edadb6b2ea))
* **ui-scale:** add the interface scale menu to the top bar ([8eeac65](https://github.com/CatFoxVoyager/MermaidStudio/commit/8eeac65b84d0f6351eef91dd8db60869a37369e7))
* **ui-scale:** align visual editor overlays, fit and pan under scale ([075004b](https://github.com/CatFoxVoyager/MermaidStudio/commit/075004bde4306b2117495feeaaf2cb08ab50d85d))
* **ui-scale:** anchor menus, pickers and popovers in local pixels ([90928db](https://github.com/CatFoxVoyager/MermaidStudio/commit/90928dbb90ba3cb0faa63a6c02ffcd1f8847a5b0))
* **ui-scale:** announce automatic scale once with change action ([570b7d6](https://github.com/CatFoxVoyager/MermaidStudio/commit/570b7d6319f9e343a6adf5885b5e74a7afe64e40))
* **ui-scale:** apply automatic scale by default, before first render ([387395c](https://github.com/CatFoxVoyager/MermaidStudio/commit/387395c011f19effca18b935b7237c618c8d3830))
* **ui-scale:** exempt the CodeMirror subtree and scale it by font size ([9d37ed8](https://github.com/CatFoxVoyager/MermaidStudio/commit/9d37ed8ec1d11d82bec2299b2ef0212b97f943c5))
* **ui-scale:** keep preview overlays, fit and pan aligned under scale ([9028c8f](https://github.com/CatFoxVoyager/MermaidStudio/commit/9028c8f0ff0f7d8771a46659e6d4ba64e5362313))
* **ui-scale:** open the scale menu from the command palette ([f7c99d4](https://github.com/CatFoxVoyager/MermaidStudio/commit/f7c99d4b2c7c84ce11b7579c547b0fb356023c07))
* **ui-scale:** root zoom and scale-aware viewport units ([33816f6](https://github.com/CatFoxVoyager/MermaidStudio/commit/33816f62b1ecff0f3cee00e7f3c8846650d8c7c2))


### Bug Fixes

* **e2e:** throw on missing DOM targets in worstOverlayOffset ([9c8b4a7](https://github.com/CatFoxVoyager/MermaidStudio/commit/9c8b4a7727d81b993dbac7439a3b63502b54a8f3))
* **modals:** activate mobile editor on confirm and fix dark contrast ([53e24d3](https://github.com/CatFoxVoyager/MermaidStudio/commit/53e24d32db9fcd05ff4e741fcfe7f54d9039e6bd))
* **render:** apply look switches and Recursive font variations ([48fba7c](https://github.com/CatFoxVoyager/MermaidStudio/commit/48fba7c65941f2f5d1fd5676698b70f81de22588))
* **ui-scale:** counter-zoom mermaid sandbox and sync picker anchor ([0441fd0](https://github.com/CatFoxVoyager/MermaidStudio/commit/0441fd0c45c38223f8a2eb3b71de95d880da15d1))
* **ui-scale:** isolate scale shortcuts, boot fallback, and focus ([3e2f972](https://github.com/CatFoxVoyager/MermaidStudio/commit/3e2f972f30f76bd28b4c003af1469ca172ae5c23))

## [3.1.0](https://github.com/CatFoxVoyager/MermaidStudio/compare/mermaid-studio-v3.0.0...mermaid-studio-v3.1.0) (2026-11-23)


### Features

* **canvas:** default theme to redux-color and enable unlimited pan ([43a3193](https://github.com/CatFoxVoyager/MermaidStudio/commit/43a3193847f7eacb5bda118698ea1deabdcaaeeb))


### Bug Fixes

* resolve visual overflow, auto-fit, edge styles, and redux default ([c199058](https://github.com/CatFoxVoyager/MermaidStudio/commit/c199058c4dc4d3236c86f171ce547945a104659a))
* **templates:** include all templates in All tab and localize labels ([b3c432a](https://github.com/CatFoxVoyager/MermaidStudio/commit/b3c432a1e5614f59a15ab332a608a1d76a7104ab))

## [3.0.0](https://github.com/CatFoxVoyager/MermaidStudio/compare/mermaid-studio-v2.7.0...mermaid-studio-v3.0.0) (2026-11-22)


### ⚠ BREAKING CHANGES

* **shapes:** Icon and Image are now unified as shapes in ShapePicker and the node inspectors, removing the separate Content (Text | Icon | Image) tabs.

### Features

* **38-01:** complete 53-shape SSOT registry with drift test ([780e3bd](https://github.com/CatFoxVoyager/MermaidStudio/commit/780e3bdfca4b865ee20e0b12924f0ffb9e4dff0a))
* **38-01:** re-key toolbar asymmetric entry to canonical odd ([e41bd9b](https://github.com/CatFoxVoyager/MermaidStudio/commit/e41bd9be06c211f51f9494377e4379d83e678863))
* **38-01:** wire canonical odd shape through directive pipeline ([d623133](https://github.com/CatFoxVoyager/MermaidStudio/commit/d623133138cd886e7fdf648cca171e5be62fa53c))
* **38-02:** prove full-domain round-trip with 53-key render sweep ([1d97d87](https://github.com/CatFoxVoyager/MermaidStudio/commit/1d97d87b09ec845a0302177d3df0b97bb1b037e3))
* **38-02:** re-key codeUtils to canonical shapes with authoredShape ([0df3a95](https://github.com/CatFoxVoyager/MermaidStudio/commit/0df3a951c14ee1ee8cc02bbe80afc02bc27c052a))
* **38-03:** img: fence hardening and single-mutation-vocabulary canvas ([dbdd270](https://github.com/CatFoxVoyager/MermaidStudio/commit/dbdd270eac3a298656135e5081fbe67a804e4ecb))
* **38-03:** two-pass directive-line cascade and guarded removeNode ([524a490](https://github.com/CatFoxVoyager/MermaidStudio/commit/524a4909afd81f69fffa350cdcdc1fa0c32c8c9c))
* **38-04:** re-key shape labels to the canonical 53 slugs ([7a02b2c](https://github.com/CatFoxVoyager/MermaidStudio/commit/7a02b2caaf7e30eba16c44ea924de4924aa1b6bb))
* **38-05:** shared ShapePreview table + ShapePicker popover ([f5e75f0](https://github.com/CatFoxVoyager/MermaidStudio/commit/f5e75f0f8ba19bb386442a9e2e2f1841035e6cab))
* **38-05:** toolbar derives 53 shapes from SSOT, atomic 53 lock ([b8b6227](https://github.com/CatFoxVoyager/MermaidStudio/commit/b8b622778d7d38f841e027c2759ae987de135d08))
* **38-06:** close migration window - union equals registry 53 ([152458f](https://github.com/CatFoxVoyager/MermaidStudio/commit/152458fb67c53212233a529751db6ba9f9faa4a3))
* **38-06:** node style panel shape row wired through preview panel ([974577b](https://github.com/CatFoxVoyager/MermaidStudio/commit/974577b8608d1897065dcfc37eaf39029f2df653))
* **38-06:** properties panel picker swap with mixed idiom + tests ([b5d338d](https://github.com/CatFoxVoyager/MermaidStudio/commit/b5d338d08a7eaa217fbc677fff9852882a4f36df))
* **39-01:** icon/img mutators with Surface-1 cross-strip semantics ([c049e2d](https://github.com/CatFoxVoyager/MermaidStudio/commit/c049e2db4f59a7a16d6a9eb0cfaea590bc657a96))
* **39-01:** typed icon/img spans, narrowed fence, render oracle ([0b4d800](https://github.com/CatFoxVoyager/MermaidStudio/commit/0b4d800b4c50ad33858d64db21fa181c4caed04f))
* **39-02:** lazy FA6 icon packs with vendor lock and render oracle ([e7c982f](https://github.com/CatFoxVoyager/MermaidStudio/commit/e7c982fda390b00f2db7e16a14b43fedb989ad8f))
* **39-03:** add PNG export CORS inlining with counted-failure warning ([eb20394](https://github.com/CatFoxVoyager/MermaidStudio/commit/eb20394652a2e20ce325ba32ebf691aeac5796c2))
* **39-03:** image-href allowlist + SMIL on* hardening ([54b021c](https://github.com/CatFoxVoyager/MermaidStudio/commit/54b021c6f3a82cf14af9d252c8e80fcdefb36006))
* **39-03:** narrow event-handler pattern to tag/exec-value shapes ([1420a86](https://github.com/CatFoxVoyager/MermaidStudio/commit/1420a869fd9ca0cac18ed118b341959cf35a1e70))
* **39-04:** add media-mode tabs and icon param rows to NodeStylePanel ([fbed6e4](https://github.com/CatFoxVoyager/MermaidStudio/commit/fbed6e4eb3c7d8b62a4f5c373601844cff857e73))
* **39-04:** recognize icon/img node groups at all three selector sites ([d5296c1](https://github.com/CatFoxVoyager/MermaidStudio/commit/d5296c17528c28d3e4e28f44b60fa7be44f1da21))
* **39-04:** thread media tabs through both editors with VisualNode data ([5258ed8](https://github.com/CatFoxVoyager/MermaidStudio/commit/5258ed839e0392b8f13ca1d849cbe06ca88a2b0f))
* **39-05:** lazy-pack IconPicker with bounded grid and declared states ([4b6a960](https://github.com/CatFoxVoyager/MermaidStudio/commit/4b6a960593a94b8cce55e5af2f1d602d0b1dbd74))
* **39-05:** paste, advisory, fit switch, i18n, both-panel parity ([ed16424](https://github.com/CatFoxVoyager/MermaidStudio/commit/ed164245578c0456366d2aad4f759abfb5fc14f1))
* **39-05:** upload -&gt; compress -&gt; emit -&gt; thumbnail tracer slice ([b5fda36](https://github.com/CatFoxVoyager/MermaidStudio/commit/b5fda36c03b126779028814c424f2ef46b3affef))
* **40-01:** edge metadata grammar promotion with Animate toggle tracer ([322a469](https://github.com/CatFoxVoyager/MermaidStudio/commit/322a4694eee8871ee7491366e91cb0862872983c))
* **40-01:** edge params, comma escapes, markdown survival ([5b678a9](https://github.com/CatFoxVoyager/MermaidStudio/commit/5b678a98d51293c4b5e3749daca10ee81dae2ff3))
* **40-01:** land all 35 phase-40 i18n keys with parity battery ([5905bfb](https://github.com/CatFoxVoyager/MermaidStudio/commit/5905bfb084a8f11d9e6b1e18e3579df744724c2b))
* **40-02:** edge-inspector rows, animate preset, selector pins ([2611e5c](https://github.com/CatFoxVoyager/MermaidStudio/commit/2611e5cbec5fe61be0f381262a7901b877671390))
* **40-02:** length-aware arrow grammar, amp chains, surgical mutators ([e646112](https://github.com/CatFoxVoyager/MermaidStudio/commit/e646112b05f2664b9652f9236498952b4ea17d5f))
* **40-02:** shared 16-token picker, dead strip deleted, EdgePanel i18n ([66f0993](https://github.com/CatFoxVoyager/MermaidStudio/commit/66f0993535140355e45581a64c9979a66bee1c38))
* **40-03:** 13-curve grid + step/markdown config plumbing ([6a85d8b](https://github.com/CatFoxVoyager/MermaidStudio/commit/6a85d8b611531119a3665580c980e38eaad52312))
* **40-03:** badges z-order + selector-scope source pins ([92f76d8](https://github.com/CatFoxVoyager/MermaidStudio/commit/92f76d8833be7c47e019fae7f493ab26d7ab4c11))
* **40-03:** export-scoped stepNumbers PNG badge toggle ([8082cc8](https://github.com/CatFoxVoyager/MermaidStudio/commit/8082cc8a2d8ef3fe24729495c5eb21f6c3a0863b))
* **40-04:** subgraph view toggle and collapsed-group routing ([7f0113b](https://github.com/CatFoxVoyager/MermaidStudio/commit/7f0113b667cb186dafa418403afdd75e48bfbc1b))
* **40-04:** view directive parse + updateSubgraphView mutator ([50a03a5](https://github.com/CatFoxVoyager/MermaidStudio/commit/50a03a530be7edb474b127fb727d010ebd279087))
* **40-04:** visual subgraph bands and collapsed drop guard ([85bad41](https://github.com/CatFoxVoyager/MermaidStudio/commit/85bad41cbb2a0b24fc5decf9b6693b950bf4ff41))
* **41:** add 10 missing families, themes, sweeps and templates ([593bc63](https://github.com/CatFoxVoyager/MermaidStudio/commit/593bc63a268ac4ecfc063082caf9af6e2b7cda05))
* **42:** modernize codemirror syntax, autocomplete and ai prompts ([992f467](https://github.com/CatFoxVoyager/MermaidStudio/commit/992f4676311cbccdffe2498480f49551bead1a9b))
* **agentflow:** add family, diagnostics, template & AI support ([c84f429](https://github.com/CatFoxVoyager/MermaidStudio/commit/c84f429ab8454654c64d84781b26647bc76320f6))
* **config:** add v12 per-diagram configs, syntax & e2e parity ([a3bb359](https://github.com/CatFoxVoyager/MermaidStudio/commit/a3bb35918d11dfa7d8aa2857fa717876a328666b))
* **layouts:** add 7 ELK algos, ELK options, tidy-tree & logos/mdi packs ([a02dccb](https://github.com/CatFoxVoyager/MermaidStudio/commit/a02dccb3cd30e6e489a5c31c21f1eeddd747c301))
* **shapes:** unify icon and image as shapes in picker and panels ([daaecef](https://github.com/CatFoxVoyager/MermaidStudio/commit/daaecef673185b11bf82bd18d9f6b7eebc7cc761))
* **styling:** gate border-radius by shape & sync visual node styles ([8d5a5ae](https://github.com/CatFoxVoyager/MermaidStudio/commit/8d5a5aece6e00966b54ac1c7212f7ca7784ee9d0))
* **styling:** refine style panels & add global edge styling ([84ba11b](https://github.com/CatFoxVoyager/MermaidStudio/commit/84ba11b479a662e59ce81bf34538105a7617d7e7))
* **themes:** add v12 native themes, look, step numbers & themeCSS ([abb1468](https://github.com/CatFoxVoyager/MermaidStudio/commit/abb146849180444e7d02246cab652f4921d7ef68))


### Bug Fixes

* **38-05:** re-key downstream toolbar test mocks to canonical slugs ([3b7e97e](https://github.com/CatFoxVoyager/MermaidStudio/commit/3b7e97ee600c7c0c354b786e0b439411ab7730c7))
* **38:** span-aware legacy shape rewrite on edge lines ([248da2d](https://github.com/CatFoxVoyager/MermaidStudio/commit/248da2dc0dfb17a3555bdde1a72f9165037308f4))
* **38:** wr-01 close PERF-01 gate bypass import forms ([1d07284](https://github.com/CatFoxVoyager/MermaidStudio/commit/1d07284a8ff51973b95f8ab40b69da9ec1494ea9))
* **38:** wr-02 guard visual canvas keys from contenteditable targets ([1a01eeb](https://github.com/CatFoxVoyager/MermaidStudio/commit/1a01eebff1ce4eef520a3d3f5bcc46a95b31cf06))
* **38:** wr-03 un-guard PreviewPanel test assertions ([65f0c71](https://github.com/CatFoxVoyager/MermaidStudio/commit/65f0c7170804d8ab567fa5afddf76d5666c56d6a))
* **39-02:** fallback oracle fixture follows fa packs registration ([b458112](https://github.com/CatFoxVoyager/MermaidStudio/commit/b458112f19a36e62ec6772ee8f8438b82d117fda))
* **39:** wR-01 gate HTML img src with the image-href allowlist ([9ef55b3](https://github.com/CatFoxVoyager/MermaidStudio/commit/9ef55b37f0262c2f9744b0097e2caaef8a8a275e))
* **39:** wR-02 update ExportModal doubles to the validated-mime contract ([219fc09](https://github.com/CatFoxVoyager/MermaidStudio/commit/219fc09b8d5ad63003be470582d6afc53a4f54a8))
* **39:** wR-02 validate inline mime before SVG substitution ([fb71a76](https://github.com/CatFoxVoyager/MermaidStudio/commit/fb71a76b61f490de8210165ebff79f960d345533))
* **39:** wR-03 typed error for image decode failure ([12895f0](https://github.com/CatFoxVoyager/MermaidStudio/commit/12895f0ed1e59a9d86c6d22ea5647141f7dff33a))
* **39:** wR-04 cap decoded pixels before canvas encode ([edd3260](https://github.com/CatFoxVoyager/MermaidStudio/commit/edd3260da8abce88b96fa9819eeb6def1fadbdfe))
* **39:** wR-05 correct legacy-span migration comments ([f84fae6](https://github.com/CatFoxVoyager/MermaidStudio/commit/f84fae670330e15ca820728cd0fa0f1b03b0bbae))
* **39:** wR-06 gate media attribute carriers in the sanitizer hook ([6370500](https://github.com/CatFoxVoyager/MermaidStudio/commit/63705002e803c2c120e015dfb7209ba7972c0441))
* **40:** clear stepDuration on undefined and tighten review fixes ([46a30cb](https://github.com/CatFoxVoyager/MermaidStudio/commit/46a30cb7389dd06c5e4acd2d7817faf56b0b7030))
* **40:** resolve live uat collapsed-group, touch floor & loop bugs ([31b865d](https://github.com/CatFoxVoyager/MermaidStudio/commit/31b865df65eaab79fd6f8162e7fa90115b9db85c))
* **media:** allow pasted raster data URIs and fallback PNG to WebP ([c06c5e9](https://github.com/CatFoxVoyager/MermaidStudio/commit/c06c5e93dca24cdbd6f47935b0ee789da79a672d))
* **mermaid:** complete phase 43 P0 fixes, math, frontmatter and polish ([ca5775d](https://github.com/CatFoxVoyager/MermaidStudio/commit/ca5775d5750f4d26573f5640cdccff9bccea598d))
* **mobile:** enlarge IconPicker pack tabs to 44px & add v1.9 mobile E2E ([06dd529](https://github.com/CatFoxVoyager/MermaidStudio/commit/06dd529c918584205b866d697deff38620b5d01c))


### Performance Improvements

* **rendering:** optimize diagram render pipeline (-40% composite) ([1ea81c1](https://github.com/CatFoxVoyager/MermaidStudio/commit/1ea81c14bae4d25fa081a7c09665f7c49b99ec9b))

## [2.7.0](https://github.com/CatFoxVoyager/MermaidStudio/compare/mermaid-studio-v2.6.0...mermaid-studio-v2.7.0) (2026-11-20)


### Features

* **deps:** mermaid 12.3.0 + official examples library, with visual-editor safety fixes ([a86e8d8](https://github.com/CatFoxVoyager/MermaidStudio/commit/a86e8d86d38635f1400a47eba2ea033ea43745ef))
* **deps:** upgrade mermaid to 12.3.0 and add official examples library ([a6f92ab](https://github.com/CatFoxVoyager/MermaidStudio/commit/a6f92ab270a7f1a82ac0cdd14eeeb9c0520664a4))
* **mobile:** direct Template Library row in the menu sheet ([a8dc4fa](https://github.com/CatFoxVoyager/MermaidStudio/commit/a8dc4fa7715e15f38ff38fbca24b42074fb75913))
* **templates:** add French titles/descriptions for official examples ([94b6d0f](https://github.com/CatFoxVoyager/MermaidStudio/commit/94b6d0f42cb87f0bb67b6f271a4e28cc18638c51))
* **visual:** chain and bare-edge-id round-trip in the visual editor ([c7b48c6](https://github.com/CatFoxVoyager/MermaidStudio/commit/c7b48c6d1c0c8159b2740866063fd6c47f404414))


### Bug Fixes

* **mobile:** offer the Template Library command in the mobile palette ([435d89c](https://github.com/CatFoxVoyager/MermaidStudio/commit/435d89ce79d31b831957cc7083135266fa34cf81))
* **templates:** mobile-true header count and retry after a failed load ([d7c0087](https://github.com/CatFoxVoyager/MermaidStudio/commit/d7c008745c829520ba98ad8779d4aabe5b49d3c2))
* **templates:** show an error state when a preview render fails ([af810b5](https://github.com/CatFoxVoyager/MermaidStudio/commit/af810b5808716ae9fee4b090bb73ffb18b7b1408))
* **templates:** type RESTRICTED_TYPES and fix stale architecture label ([b7c517b](https://github.com/CatFoxVoyager/MermaidStudio/commit/b7c517b72dd5f892fd9df9193a9d1a9d622efbce))
* **visual:** fence bare 12.3 edge ids from the visual editor ([e08d658](https://github.com/CatFoxVoyager/MermaidStudio/commit/e08d65896934870d5dd0c7139381a8fb1db88532))
* **visual:** parse chained edge hops and fence multi-hop lines ([e6c902c](https://github.com/CatFoxVoyager/MermaidStudio/commit/e6c902cfe0100dad4931113d3720a7c81193b274))

## [2.6.0](https://github.com/CatFoxVoyager/MermaidStudio/compare/mermaid-studio-v2.5.0...mermaid-studio-v2.6.0) (2026-11-18)


### Features

* **seo:** above-the-fold CTA, screenshot img, question-form H2s ([02f1716](https://github.com/CatFoxVoyager/MermaidStudio/commit/02f17161416ff8854d024c271133f08c2721a97c))
* **seo:** add branded 404 page and JSON-LD alternateName ([dc34fa1](https://github.com/CatFoxVoyager/MermaidStudio/commit/dc34fa1bfa443b9ca3d1c198d24764dbb3ac2728))


### Bug Fixes

* **editor:** surface Advanced Styling as a direct desktop toolbar button ([4f4719b](https://github.com/CatFoxVoyager/MermaidStudio/commit/4f4719bb1a13f232f781e743435244bdbf1f795f))
* **seo:** drop dead Ko-Fi link, canonicalize MIT URL, harden headers ([a994325](https://github.com/CatFoxVoyager/MermaidStudio/commit/a9943254ad14556d6379fd3cf6e63ea9c1d026e8))
* **seo:** remove dead Ko-Fi link from app UI, tests and README ([40ce8c2](https://github.com/CatFoxVoyager/MermaidStudio/commit/40ce8c24bb3d223b97c95bb2584076353b455b4d))
* **tabs:** propagate sidebar rename to the open tab title ([2b2d643](https://github.com/CatFoxVoyager/MermaidStudio/commit/2b2d643536b8f3ed81364e609c89c4675d66a20b))
* **theme:** drop previous theme's derived colors on a theme switch ([1c4c860](https://github.com/CatFoxVoyager/MermaidStudio/commit/1c4c8606093ab9c48187837ea1e00509d2c5a597))
* **ui:** tab rename propagation + desktop Advanced Styling toolbar button ([12d35ba](https://github.com/CatFoxVoyager/MermaidStudio/commit/12d35ba0e073191f8696cadbad76f15f0868f54f))

## [2.5.0](https://github.com/CatFoxVoyager/MermaidStudio/compare/mermaid-studio-v2.4.3...mermaid-studio-v2.5.0) (2026-11-16)


### Features

* **editor:** add Google Play Android link on empty workspace ([19137e7](https://github.com/CatFoxVoyager/MermaidStudio/commit/19137e7c149794c94d49864f720f4d5cb03405e1))


### Bug Fixes

* **ci:** stop pnpm warnings from corrupting audit JSON parsing ([06b7cbf](https://github.com/CatFoxVoyager/MermaidStudio/commit/06b7cbf8fb13ce365c22b54ef4f57943d473d858))
* **ci:** stop pnpm warnings from corrupting audit JSON parsing ([2dfaf3f](https://github.com/CatFoxVoyager/MermaidStudio/commit/2dfaf3f5d46671a60ec7e8b87bcf1ba8acc0e3b7))
* **e2e:** cap self-hosted job runtime at 30 min ([a2d450b](https://github.com/CatFoxVoyager/MermaidStudio/commit/a2d450b4512c032896b79dec839c94c717f516cc))

## [2.4.3](https://github.com/CatFoxVoyager/MermaidStudio/compare/mermaid-studio-v2.4.2...mermaid-studio-v2.4.3) (2026-11-02)


### Bug Fixes

* **deps:** bump CDN embed pin and SRI hash to mermaid 12.2.0 ([44f4370](https://github.com/CatFoxVoyager/MermaidStudio/commit/44f4370655d3f95c42d554c5816d6d063b516c13))
* **deps:** pin undici to 8.11.2 ([a747aef](https://github.com/CatFoxVoyager/MermaidStudio/commit/a747aeff1075d7c1c469d2965f9916472f283898))
* **deps:** update chore(deps): non-major updates ([f5e4ead](https://github.com/CatFoxVoyager/MermaidStudio/commit/f5e4ead044cb4319f7ebcf1ace2ebaf62faffb10))
* **deps:** update dependency crewai to &gt;=1.15.34,&lt;2.0.0 ([5e157ce](https://github.com/CatFoxVoyager/MermaidStudio/commit/5e157cef3abcde7f185bdaa8ca6f6baf0da486d1))

## [2.4.2](https://github.com/CatFoxVoyager/MermaidStudio/compare/mermaid-studio-v2.4.1...mermaid-studio-v2.4.2) (2026-11-02)


### Bug Fixes

* **e2e:** disable webkit DMABUF renderer in CI ([ac0f569](https://github.com/CatFoxVoyager/MermaidStudio/commit/ac0f5692607d84d7d77cb12d7fd285fcdd0f2215))

## [2.4.1](https://github.com/CatFoxVoyager/MermaidStudio/compare/mermaid-studio-v2.4.0...mermaid-studio-v2.4.1) (2026-11-02)


### Bug Fixes

* **ci:** read pnpm version from packageManager ([7fab35a](https://github.com/CatFoxVoyager/MermaidStudio/commit/7fab35ae818ae268b13309d457fed9a87d7220c4))

## [2.4.0](https://github.com/CatFoxVoyager/MermaidStudio/compare/mermaid-studio-v2.3.0...mermaid-studio-v2.4.0) (2026-11-02)


### Features

* **34-01:** play promo anchor + isNativeShell util + badges ([d3343c3](https://github.com/CatFoxVoyager/MermaidStudio/commit/d3343c33b55f4c8226695e6a6fa60ff71f37729e))
* **34-02:** retire android coming-soon copy, guard banner natively ([5fc29d0](https://github.com/CatFoxVoyager/MermaidStudio/commit/5fc29d063469dde07a493742ac3a365821869a66))
* **34-02:** swap menu-sheet divide-y for spacing rhythm via d6 gate ([ccfb801](https://github.com/CatFoxVoyager/MermaidStudio/commit/ccfb801100af19eea9892dac647adf714aaf70ca))
* **36-01:** consent-denied GA4 loader + behavioral contract ([776ff0d](https://github.com/CatFoxVoyager/MermaidStudio/commit/776ff0d55977c759a33be2fa66343ec06bfd9246))
* **36-01:** repo-owned CSP collector + GA4-no-Ads origins ([b9353bf](https://github.com/CatFoxVoyager/MermaidStudio/commit/b9353bf861e818e882432ca4b0bef2065a8984fc))
* **36-01:** trust-copy sweep discloses consent-denied GA4 ([a029ae7](https://github.com/CatFoxVoyager/MermaidStudio/commit/a029ae7d7ca85fa4c81cba0e93da26a5d612cdd5))


### Bug Fixes

* **33:** guard reads component-prefixed tags; llms.txt pin scoped ([95d3657](https://github.com/CatFoxVoyager/MermaidStudio/commit/95d3657b5940d92b9d973827773089ad5fecbcca))
* **33:** version-tag guard reads component-prefixed release tags ([0d02cb2](https://github.com/CatFoxVoyager/MermaidStudio/commit/0d02cb29f5bac07947df37c02d7d06ce91fb223c))
* **34:** wr-01 census bans retired EN coming-soon value by fragment ([599ebd0](https://github.com/CatFoxVoyager/MermaidStudio/commit/599ebd005a38f847d00ec000ff4ca368096e09d6))
* **34:** wr-02 explicit accessible name on Play promo anchor ([d3d7036](https://github.com/CatFoxVoyager/MermaidStudio/commit/d3d7036186d70341bc20fdd24bbb8704c77f9c4f))
* **36:** wr-01 scope the consent-form claim to the ads leg ([23bf0b4](https://github.com/CatFoxVoyager/MermaidStudio/commit/23bf0b4c6b202085e8ebea9f23d74a01c84cb290))
* **36:** wr-02 allowlist collector directive before logging ([5186583](https://github.com/CatFoxVoyager/MermaidStudio/commit/51865834ce720bfea584032f21a8d80341ace37e))
* **36:** wr-03 stub empty measurement id in no-op test ([aa7194b](https://github.com/CatFoxVoyager/MermaidStudio/commit/aa7194b91652d03b3e78a0b496f598af8b57094e))

## [2.3.0](https://github.com/CatFoxVoyager/MermaidStudio/compare/mermaid-studio-v2.2.0...mermaid-studio-v2.3.0) (2026-11-01)


### Features

* **29-01:** apply 8s boot-splash fade composed with 12s swap ([39906c1](https://github.com/CatFoxVoyager/MermaidStudio/commit/39906c121b36a7a9ba2035777b037dc114814a18))
* **29-01:** drop duplicated font import, pin 1-request gates ([185088f](https://github.com/CatFoxVoyager/MermaidStudio/commit/185088f578edfead3e7822ba89568fa7939c2f69))
* **29-01:** gate Google Fonts injection to actual need ([3a68c14](https://github.com/CatFoxVoyager/MermaidStudio/commit/3a68c14da033ea350fd218d31de3c5681e48277b))
* **29-02:** dynamic-import initMermaid in the two boot hooks ([5a7e57f](https://github.com/CatFoxVoyager/MermaidStudio/commit/5a7e57fd95f9956f0825fbd6a8fa242d1ed65685))
* **29-02:** extract core-free diagramType module + parser repoints ([323db8c](https://github.com/CatFoxVoyager/MermaidStudio/commit/323db8c4c62f01853a07f3eb904b6a41a5aadb26))
* **29-02:** lazy primitives, modal boundaries, census guard (RED) ([d9d857e](https://github.com/CatFoxVoyager/MermaidStudio/commit/d9d857e3f72d804f48f053b1a2e2c694c7926207))
* **29-03:** add MobileWorkspace lazy boundaries (mobile chain closure) ([28ba097](https://github.com/CatFoxVoyager/MermaidStudio/commit/28ba097b76a911c7c80dd9ef0cfb2a5194639853))
* **29-03:** add WorkspacePanel lazy boundaries + idle prefetch ([3c19a2e](https://github.com/CatFoxVoyager/MermaidStudio/commit/3c19a2efd4400e7ddcabaaee32138d06ecbc5b48))
* **29-03:** de-eager historyActions, census GREEN, CI wiring ([ccbbff1](https://github.com/CatFoxVoyager/MermaidStudio/commit/ccbbff11b80c3476e8c0c39f50132e3670dcd143))
* **30-01:** build-generated llms.txt + repo entity fields ([dc536d0](https://github.com/CatFoxVoyager/MermaidStudio/commit/dc536d03aed534431e1416b5de4f5ff11afa4467))
* **30-01:** composed 1200x630 og-image card via capture pipeline ([81add49](https://github.com/CatFoxVoyager/MermaidStudio/commit/81add49fc3eb405ed1ae31194f687f0815d3443b))
* **30-01:** generator emits llms.txt + gate suite completed ([7e16ab5](https://github.com/CatFoxVoyager/MermaidStudio/commit/7e16ab5431e034dbbad350d0fc8bc25ec95a021b))
* **30-01:** prebuild generator emits build-dated 2-URL sitemap ([d12807c](https://github.com/CatFoxVoyager/MermaidStudio/commit/d12807ca0cb22dae3f920ba3f7f5067676cf3996))
* **30-02:** add HSTS includeSubDomains to the edge headers ([bbd9578](https://github.com/CatFoxVoyager/MermaidStudio/commit/bbd95785d6b69b45e561f013424dd3974e3ae70e))
* **30-02:** link docs and changelog from the shell trust line ([6376b41](https://github.com/CatFoxVoyager/MermaidStudio/commit/6376b416911e3b389c0b8c2fbd66fbf87b2da015))
* **30-02:** merged JSON-LD head, og card metas, description trim ([5ad59f6](https://github.com/CatFoxVoyager/MermaidStudio/commit/5ad59f64c6903f2ca42b014abd7a860f9a179e57))
* **31-01:** french route head contract + sitemap leg ([98adf15](https://github.com/CatFoxVoyager/MermaidStudio/commit/98adf15f626a8fd36fa0f2edb2de3675e91a1f33))
* **31-01:** french shell body + honesty census ([6184a08](https://github.com/CatFoxVoyager/MermaidStudio/commit/6184a08a97b29c3044cc621a204d4afe6bcb5eb6))
* **33-01:** version-tag drift guard + fixture suite ([34e1698](https://github.com/CatFoxVoyager/MermaidStudio/commit/34e16982c215f6c5bd1e1868a899c269a371758f))
* **33-01:** wire version-tag guard into the build job ([fdabdd8](https://github.com/CatFoxVoyager/MermaidStudio/commit/fdabdd883e3959952d77fc0622a0ebf34fed733e))


### Bug Fixes

* **28:** wR-01 honest welcome.intro copy, census the claim class ([379bf8f](https://github.com/CatFoxVoyager/MermaidStudio/commit/379bf8ff40ca9c5bfcdbabc12988bf9e672ba87e))
* **28:** wR-02 drop absolute no-server claims from shell copy ([8c5e52b](https://github.com/CatFoxVoyager/MermaidStudio/commit/8c5e52be2146bbbf4bb2f4e25a4109b761ba475e))
* **28:** wR-04 fs census makes exactly-one-h1 contract total ([ed4edff](https://github.com/CatFoxVoyager/MermaidStudio/commit/ed4edff14ca469cb8cbcb5a77b43b802b5ec0f34))
* **29:** in-01 catch rejected mermaid boot imports in both hooks ([f5be246](https://github.com/CatFoxVoyager/MermaidStudio/commit/f5be246bc78403e3c627befa90e49ecdbf899624))
* **29:** wr-01 self-clean failed font links so the next call retries ([160e85a](https://github.com/CatFoxVoyager/MermaidStudio/commit/160e85a9ffcf5107e88873fcdbc47a3b72e3768e))
* **29:** wr-02 scope sibling lazy modal chunks with error boundaries ([e928547](https://github.com/CatFoxVoyager/MermaidStudio/commit/e928547576af974b680d7cd1c8f3a2c39041bb28))
* **ci:** let action-setup read pnpm version from packageManager ([4d87654](https://github.com/CatFoxVoyager/MermaidStudio/commit/4d87654eb87740e89e2d680f6c2fbde332c69a5e))
* **ci:** packages write for GHCR first publish; docs landing index ([7440f43](https://github.com/CatFoxVoyager/MermaidStudio/commit/7440f43e0222993fe8d987ffc0b6797171e75f6e))

## [2.1.0] - 2026-10-09

### Changed
- **Version aligned with the Android app (2.1.0)** - the web and native shells now share one version line; the Android 2.1.0 Play release carries the same feature set.

### Fixed (mobile device-walk parity)
- Preview zoom row mirrors the Android bar: type badge and zoom % hidden on mobile, icons fixed and centered (no sideways scroll affordance)
- Shape toolbar on mobile: fixed row (one primary + adjacent More chip), hidden measurement strip neutralized so it can no longer make ancestors touch-pannable
- Preview pane is a vertical-only scroller; overscroll containment on canvas and scroll rows (drag no longer drags the workspace)

### Added
- `app-ads.txt` served at the domain root for the AdMob app association
- LAN device testing: dev server accepts non-localhost hosts (dev-only)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.0] - 2026-10-06

The mobile editor received a full design-polish pass (31 review/fix iterations,
convergence double-verified): every touch surface, overlay and error state was
measured live at phone size and brought to the same bar as the desktop app.

### Added
- **Mobile menu sheet** - The bottom navigation became a bottom sheet (handle, swipe-to-dismiss, backdrop): Commands, Backup, Settings, Language and About live in one place, with the open document's name as the sheet subtitle so you always know what you are editing
- **Editor key row** - A syntax keyboard row under the code editor inserts the symbols Mermaid diagrams need most (`-->`, `|`, `{`, `"`, tab, arrows), grouped as 6 tinted insert keys and 5 command keys with 44px+ touch targets
- **"✓ Saved" flash** - Every real persist (autosave included) briefly flashes a check next to the document title on mobile; the amber checkpoint dot still shows separately, so "persisted" and "edited since checkpoint" are two honest signals instead of one ambiguous dot
- **Undo/redo everywhere on mobile** - The top bar carries undo/redo on every screen, wired to the editor history even while the Files screen is front (buttons disable honestly where history cannot act)

### Changed
- **Parse errors are readable** - A failed parse now shows an opaque card (icon, plain title, recovery button announced via `role="alert"`) instead of transparent text interleaved with the stale diagram; the root cause was fixed, not papered over: React reused the canvas host element across state branches, keeping the old diagram's shadow root alive inside the error card
- **Color picker fits the phone** - The popover now measures its real height after opening, clamps to the viewport and scrolls if needed — the last swatch row and the custom-color entry are reachable again; swatches are 40px visuals with 44px hit areas, a visible focus ring, Escape dismisses popover-then-panel layer by layer
- **Touch floor systematized** - One shared hit-target recipe (44px floor + invisible stretch) covers top bar, keycaps, swatches, sheet rows and export cards; export cards gained pressed-state feedback
- **Style panels answer Escape anywhere** - Node, Edge and Subgraph panels close on Escape regardless of keyboard focus; the node panel's desktop 12px scrollbar is gone (4px mobile rule)
- **Edge sheets name their endpoints** - The sheet header reads "Source → Target" instead of machine numbering ("Edge 1"); Connection section unchanged

### Fixed
- **Subgraph deletion leaves no orphan code** - Deleting a subgraph re-homes its nodes to the parent level AND removes the placeholder node seeded at creation (previously a stray `N1[Subgraph]` line stayed in the code); a renamed seed counts as user content and survives
- **Welcome diagram renders everywhere** - The seed content dropped its frontmatter header that the visual editor's parser rejected, so a first-time user's very first tap no longer lands on an error

## [0.9.0] - 2026-10-04

### Added
- **Import safety confirmation** - Importing a backup now shows exactly what it will replace (live diagram/folder counts, pluralized, with a dedicated "your library is empty" variant) and requires an explicit "Replace everything" action; an "export first" hint precedes the point of no return
- **Keyboard-complete dialogs** - Every dialog (Backup & Import, folder picker, delete confirmations) traps Tab inside the panel, restores focus to its trigger on close, and answers Escape from the first keystroke; document tabs are keyboard-operable (arrows, Home/End, Enter/Space) with a visible focus ring
- **"More" actions menu** - Save as Template, Version History, Diagram Colors, Advanced Styling, Fullscreen and Reset Split moved into an overflow menu; the editor toolbar now leads with Save, Diff, Export, AI and Fix
- **Clear-filters exit** - Empty search results gain a "Clear search & filters" action instead of a dead end
- **Boot splash** - Themed loading screen (spinner + app name) replaces the static SEO shell flash during cold loads; auto-dismisses when the app is ready, falls back to the crawlable shell if loading fails

### Changed
- **Honest save status** - The status bar no longer claims unsaved work: "Edited · autosaved" while typing, and real "Saved Nm ago" timestamps after each persist (previously "Not saved" showed while content was already stored); the amber dirty dot explains itself on hover, in both tab bar and toolbar
- **Dependencies refreshed, majors included** - vitest 5, jsdom 30, jest-dom 7, TypeScript 7 (native compiler); ESLint + typescript-eslint replaced by OxLint (Rust-based linter, TypeScript-version independent); Vite 8.3.2, ESLint ecosystem removal, lucide-react 1.51, transformers 4.3
- **Mermaid 12.1.0** - Engine unpinned from 12.0.0; CDN embed snippet and SRI hash re-pinned together
- **Tag chips really filter** - Clicking a tag now filters the file list (previously lit up without changing it); existing libraries get the seed tags backfilled on first load
- **Unified hover and danger theming** - Hover feedback is visible in light theme via a themed `--hover` token (all 71 white washes migrated); destructive buttons and surfaces use AA-contrast `--danger` tokens

### Fixed
- **Folder deletion confirms first** - Deleting a folder asks for confirmation and tells the truth: its diagrams and subfolders are re-parented to the parent folder, never destroyed (pluralized copy, zero-diagram variant)
- **Accessibility sweep** - aria-labels across all icon-only buttons; language menu closes on Escape and outside-click; sidebar "⋯" buttons reachable by keyboard focus; `html lang` follows the UI language; destructive contrast raised to AA (white on `#dc2626` = 4.8:1, was 3.76:1)
- **Typography floor** - No interface text below 11px (9-10px text in 25+ places raised); status bar at 12px; keyboard shortcut badges at 11px
- **Stale offline banner removed** - It advertised local AI providers that were never wired in

## [0.8.1] - 2026-09-15

### Fixed
- **Mobile bottom nav flush** - The gap between the bottom navigation and the Android gesture bar is gone: `viewport-fit=cover` removed (it made browsers report a bottom inset they don't actually overlay) and the safe-area padding zeroed in browser tabs, so the nav sits flush at the viewport bottom. The inset is honored only where the page is truly edge-to-edge (installed PWA/fullscreen). Browser chrome (URL bar, gesture zone) follows the app theme via a synced `theme-color`.

## [0.8.0] - 2026-09-14

### Changed
- **Mermaid 12 engine** - Diagram engine upgraded to Mermaid 12 with the same familiar look by design (v11 dagre/classic defaults pinned; zero user-facing regression verified by the 1446-test suite and 3-browser E2E matrix)
- **ELK layout bundled** - ELK layout engine now ships inside the Mermaid 12 package — available in the layout picker with no double download
- **Embeddable CDN build re-pinned** - CDN embed script re-pinned with an integrity hash (SRI sha384)

### Added
- **usecaseDiagram type** - New diagram type support with expanded autocomplete coverage (railroad, cynefin, swimlane layouts and new shapes)

### Security
- **SVG post-processing hardened** - Pipeline locked against real Mermaid 12 output: preview/export parity and hardened XSS sanitization

## [0.6.0] - 2026-07-03

### Added
- **Mobile responsive layout** - Dedicated mobile UI for viewports ≤768px (mobile shell with TopBar + overflow menu + bottom navigation: Files/Edit/AI)
- **Mobile workspace** - Segmented Code↔Preview toggle below 600px viewport (replaces desktop split-view on mobile)
- **Mobile drawers** - File browser (Sidebar), AI assistant, and style panels (DiagramColors, AdvancedStyle) open as slide-over drawers with mutual exclusion
- **Visual editor on mobile** - Visual drag-and-drop editor accessible via Code/Preview/Visual toggle on mobile devices
- **Touch interaction support** - Pointer events migration for unified mouse/touch handling in visual editor with pinch-to-zoom and pan
- **Safe-area inset support** - env() CSS for notch/home-indicator clearance on modern smartphones (viewport-fit=cover meta tag)
- **Mobile E2E test suite** - Comprehensive Playwright specs for mobile detection, touch targets (≥44px), touch interactions, and visual-editor touch support
- **E2E infrastructure improvements** - Dev-only Vite launcher script (`scripts/dev-e2e.mjs`) for Windows PATH compatibility + Playwright server reuse configuration
- **Comprehensive mobile UAT checklist** - `.planning/v1.2-UAT-CHECKLIST.md` for real-device validation (gates 0.6.0 release)

### Changed
- **Visual editor accessibility** - Existing Visual toggle now works on both desktop and mobile (previously desktop-only)
- **Workspace responsiveness** - Editor and preview switch from side-by-side to segmented toggle below 600px viewport
- **Typography and spacing** - Text and UI elements scale responsively on mobile for readability without manual zoom
- **Touch interaction model** - Hover-only interactions replaced with tap/active states for mobile compatibility

### Fixed
- **Touch scroll/pan in diagram preview** - Native touch-action CSS (pan-x pan-y pinch-zoom) enables smooth touch scrolling
- **Active tap states on mobile buttons** - Visual feedback during tap (active:bg-white/15) improves touch responsiveness
- **Windows E2E test compatibility** - Node PATH issue resolved via absolute-path launcher script (dev-e2e.mjs) + Playwright reuseExistingServer configuration

### Technical Notes
- **Zero desktop regression** - Desktop layout (≥1280px) remains pixel-perfect; all desktop controls/functionality unchanged
- **Zero new runtime dependencies** - Mobile UI uses existing React 19, Tailwind CSS 4, and native Touch/Pointer APIs; zero new runtime deps added
- **Version bump gated** - 0.5.1 → 0.6.0 bump explicitly DEFERRED pending 100% real-device UAT validation (see `.planning/v1.2-UAT-CHECKLIST.md`)
- **Self-signed cert handling** - HTTPS dev server (`.cert/`) requires manual browser acceptance for real-device testing (documented in UAT checklist)
- **Playwright server reuse** - Local E2E tests reuse manually-started dev server (`reuseExistingServer: !CI`) to avoid Windows subshell PATH issues

## [0.5.1] - 2026-07-01

## [0.5.1] - 2026-07-01

### Fixed
- **Template apply modal** - Applying a template no longer throws "closeModal is not a function"; the Templates modal now closes correctly (App.tsx wiring fix)
- **Mermaid SVG output** - Degenerate `<path>` elements with NaN coordinates (notably from Sankey previews) are now stripped during sanitization, reducing console errors on render

### Changed
- **Codebase hierarchy** - App-level orchestration hooks moved into `hooks/app/` (per CLAUDE.md); top-level layout components grouped into `components/layout/`; dev scripts grouped into `scripts/{docs,build,e2e}/`
- **Pre-commit hook** - No longer runs the full vitest suite (which hangs at teardown on Windows); now runs lint + type-check only. Full suite remains in CI
- **.gitignore** - Scoped overly broad patterns (`*.txt`, `.dockerignore`, `Dockerfile.dev`) to the repo root; `CLAUDE.md`, `docker/.dockerignore`, `public/robots.txt`, and three unit tests are now tracked

### Verified
- Exhaustive Playwright/Chrome pass: editor + live preview, templates (apply/create/save), AI panel with full WebGPU LLM inference (Qwen3.5 0.8B), all modals, theme, i18n (en/fr), visual editor

## [0.5.0] - 2026-04-10

### Added
- **AI Fix Diagram** - Automatically detect and fix syntax, semantic, and style issues in Mermaid diagrams
- New "Fix Diagram" button in editor toolbar (Wrench + Sparkles icon)
- AI Panel now supports fix mode with 3-pass analysis (syntax → semantic → style)
- Enhanced error handling with fallback to chat mode
- i18n support for fix mode in English and French
- E2E tests for AI fix diagram feature
- Manual testing checklist for comprehensive validation

### Changed
- AIPanel now accepts `fixMode` and `onEnterFixMode` props
- WorkspacePanel `onOpenAIPanel` now accepts mode option (`{ mode: 'fix' }`)
- useAISend hook exports `sendFixRequest` function
- mermaidSystemPrompt exports `buildFixSystemPrompt` function
- useEffect in AIPanel to auto-trigger fix request when fix mode is active

### Fixed
- Improved AI error message sanitization for security
- Fix mode now properly hides suggestions in AI Panel
- Fix mode resets correctly when closing AI Panel

### Technical
- Added `buildFixSystemPrompt` function for 3-pass diagram analysis
- Added `sendFixRequest` function in useAISend hook
- Enhanced AIPanel with fix mode state management
- Added comprehensive E2E test coverage for fix diagram feature
- Added i18n translations: `fixDiagram`, `fixDiagramTitle`, `fixDiagramButton`, `analyzing`, `noIssuesFound`, `fixErrorPrefix`, `openChatForHelp`

## [0.4.1] - 2026-04-08

### Fixed
- Fixed blank page issue on initial load
- Fixed diagram creation flow
- Fixed PNG export functionality

## [0.4.0] - 2026-04-07

### Added
- Analytics integration with privacy controls
- Security enhancements (API key encryption, XSS prevention)
- Theme system with light/dark mode support
- i18n support (English and French)
- Visual editor with drag-and-drop
- Improved UI/UX with better navigation and layout

### Changed
- Enhanced state management
- Improved error handling
- Better accessibility support

## [0.3.0] - 2026-03-25

### Added
- Initial release of MermaidStudio
- Code editor with CodeMirror 6
- Mermaid.js diagram preview
- Basic AI chat functionality
- Template library
- Export functionality (PNG, SVG)
- Version history
- Theme customization
