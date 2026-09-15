# Light Sun Energy — Solução Ambiental

Site estático em português, com layout adaptável, menu transparente, hero de arquitetura, demonstração interativa 3D e galeria de nove instalações reais. A galeria permite ampliar fotos e navegar por botões ou setas do teclado; Escape fecha a ampliação. A identidade usa preto, branco, amarelo e laranja da logo enviada pelo usuário.

## Informações confirmadas

- Venda e montagem de painéis solares.
- São Paulo, SP.
- As nove fotografias de instalações foram fornecidas pelo usuário.
- Marca Light Sun Energy — Solução Ambiental, com logo fornecida pelo usuário.

## Informações pendentes

- Número de WhatsApp e endereço de e-mail. Não há contatos fictícios ou formulários com envio simulado.

## Arquivos

- `dist/index.html`: conteúdo e metadados.
- `dist/styles.css`: identidade visual e responsividade.
- `dist/app.js`: menu e galeria.
- `dist/assembly.js`: modelo 3D ilustrativo, câmera e montagem reversível em 16 segundos.
- `dist/assets/three/`: Three.js 0.180.0 e OrbitControls, fornecidos localmente com licença MIT.
- `dist/assets/favicon.png`: ícone da aba, 256 × 256, recortado do símbolo da logo (sol e parallelogramo, sem o texto) com fundo transparente.
- `dist/assets/light-sun-energy.png`: logo em PNG com transparência real. No cabeçalho e no rodapé, uma composição CSS adapta os elementos pretos para branco e mantém o sol colorido.
- `dist/assets/projeto-01.jpg` até `projeto-09.jpg`: imagens reais, preservadas.
- `dist/assets/casa-solar.jpg`: imagem ilustrativa, gerada por IA e identificada na página.

O site não coleta dados e não exige banco de dados. As fontes Manrope e Barlow Condensed são carregadas do Google Fonts, com alternativas locais de sistema.

## Demonstração de montagem

O modelo usa `projeto-03.jpg` como referência: cobertura residencial, volume elevado e duas fileiras de sete painéis. É uma reconstrução aproximada sem medidas de engenharia, declarada como ilustrativa na interface. O telhado fica presente; suportes, trilhos e painéis são posicionados por uma função determinística do progresso. É possível retroceder livremente, reproduzir, pausar, reiniciar, girar a câmera ou aproximar/afastar. A reprodução começa somente por iniciativa do visitante e pausa ao sair da seção ou ocultar a aba. Sem suporte a WebGL, a foto real e uma explicação substituem a cena.

Referências técnicas: https://threejs.org/docs/pages/OrbitControls.html e https://threejs.org/manual/en/installation.html.

## Logo transparente

Arquivo final: `dist/assets/light-sun-energy.png`, 1792 × 878 pixels, RGBA. Produzido com a ferramenta integrada de edição de imagens a partir da logo enviada. Prompt: Preserve precisely the original logo geometry, black slanted parallelogram, yellow-to-orange gradient sun, stacked bold words LIGHT SUN / ENERGY and subtitle Solução Ambiental. Remove only the light background to actual alpha transparency. Keep small clear padding, exact spelling, original colors and layout. No checkerboard, backdrop or shadow. A tentativa de arquivo separado com tinta branca foi descartada por não produzir transparência; a aplicação clara do site usa o arquivo transparente válido com CSS.

## Imagem principal

Gerada com a ferramenta integrada imagegen, uma única geração em 1672 × 941 px; codificada em JPEG qualidade 90 para uso na web. Não é uma fotografia de um projeto realizado pela empresa.

Prompt: Use case: photorealistic-natural. Premium Brazilian solar installation company website hero photograph; illustrative architecture, no text. Create exactly one beautiful photorealistic landscape photograph, approximately 16:9, ideally 2048x1152 pixels. Elegant contemporary luxury Brazilian house made with natural stone and warm wood, floor-to-ceiling glass, swimming pool and restrained tropical landscaping. Clearly visible, physically realistic black photovoltaic solar panels neatly installed in uniform aligned rows on the roof. Sophisticated architectural photography from a slightly elevated three-quarter view; house dominates middle/right and lower frame. LEFT third is calm, darker lush trees and landscape with low detail and breathing room for a large white heading. Quiet deep blue upper sky strip for white transparent navigation. Cinematic warm late-afternoon sunlight, natural shadows, realistic photographic materials and exposure. Balanced natural greens, deep blue sky and pool water, warm sunlight, natural stone and timber. Clean standalone photograph, no people, typography, logos, interface, watermark, collage or variants. Photorealistic rather than rendered or cartoonish.
