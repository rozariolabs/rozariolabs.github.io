# rozariolabs.github.io

Site do Meu Acerto, da Rozario Labs, publicado pelo GitHub Pages (Jekyll do próprio Pages, sem build local).

| Página | URL | Arquivo |
|---|---|---|
| Início | https://rozariolabs.github.io/ | `index.html` |
| Política de privacidade | https://rozariolabs.github.io/privacidade/ | `privacidade.md` |
| Termos de uso | https://rozariolabs.github.io/termos/ | `termos.md` |

## Editar os textos legais

Os textos moram só aqui, em `privacidade.md` e `termos.md` (Markdown). O título e a data de "Última atualização" ficam no front matter (`title` e `updated`). Ao mudar um texto, atualize `updated`.

Os textos publicados ainda **não foram revisados** por advogado. A revisão está prevista antes do lançamento do app.

## Botão do Google Play

Fica escondido enquanto `play_url` estiver vazio no `_config.yml`. Quando o app estiver publicado, preencha com o link da Play Store.

## app-ads.txt

Quando houver o ID de editor do AdMob, crie `app-ads.txt` na raiz deste repositório:

```
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
```

## Regras

- Sem JavaScript, sem cookies e sem nenhum recurso de outro domínio (a fonte Figtree é servida daqui, licença em `assets/fonts/OFL-Figtree.txt`).
- Cores e logo seguem o app (`meu-acerto/lib/ui/theme/tokens.dart` e `lib/ui/widgets/logo_mark.dart`).

## Checagens

Node, sem dependências:

```bash
node tools/check.mjs                                   # arquivos-fonte
node tools/check.mjs --live https://rozariolabs.github.io   # site publicado
```
