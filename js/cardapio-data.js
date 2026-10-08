/* ============================================================
   RADICI D'AMORE · DADOS DO SITE

   COMO ATUALIZAR (4 linhas)
   1. Prato do dia ....... edite o dia em CARDAPIO > "Prato do dia" > itens (nome e descricao). O site
                           destaca sozinho o prato de hoje (fuso America/Sao_Paulo).
   2. Preços ............. edite o NÚMERO do preço no próprio item (ex.: "preco": 10  ou  "preco": 31.9, com
                           ponto, sem "R$"). O preço é escrito uma vez só: o cardápio, o "Monte sua massa" e o
                           pedido (sacola e WhatsApp) leem o mesmo valor. "preco": null = "Consultar".
                           Itens sem "preco" herdam o "preco_unico" da categoria (empanadas, prato do dia, panquecas).
   3. Fluxo recomendado: edite o radici-cardapio.json e rode  node tools/gerar-cardapio-data.js
      (o bloco CONFIG daqui nunca é sobrescrito). Sem Node? Edite direto o cardápio abaixo, mas
      então NÃO rode o gerador, ou ele volta ao que está no JSON.
   4. Confira JSON x site:  node tools/check-precos.js

   CAMPOS DO PEDIDO (cada item do cardápio)
   id ............. único, sem acento (ex.: "bolinho-de-carne-assado")
   categoriaPedido  massas | entradas | empanadas | adicionais | sobremesas | bebidas  (ordem da sacola e do WhatsApp)
   pedivel ........ true = tem botão "+ adicionar"
   preco .......... número (null = "Consultar" / valor a confirmar). Sem "preco": herda o "preco_unico" da categoria
   opcoes ......... grupos de escolha: { id, titulo, obrigatorio, tipo: "unica" | "texto", itens: [{ nome, preco }] }
                    - preco do item da opção: "soma" ao preço do prato (ex.: ravioli + 5) ou, se o grupo tem
                      "preco": "substitui", É o preço do prato (ex.: porção pequena / grande)
                    - "viraNome": true  -> a opção escolhida vira o nome na mensagem (ex.: "Refrigerante lata")
                    - "itensDe": "recheios" -> usa a lista "recheios" da própria categoria
                    - tipo "texto" = campo livre (ex.: "Qual sabor?", com "dica")
                    - "opcoes" na categoria vale para todos os itens dela (ex.: Piatto per due)
                    - "erro": mensagem em vinho quando falta a escolha obrigatória (ex.: "Escolha com ou sem pimenta")
                    - "minuscula": true -> na sacola e no WhatsApp a escolha vai em minúsculas (ex.: "sem pimenta")
   pimenta ........ só em "Monte sua massa": grupo de escolha obrigatória que aparece abaixo dos molhos quando o
                    molho com o id de "pimenta.molho" (carbonara) está marcado. Não muda o preço.
   nomePedido ..... nome mais curto para a sacola / WhatsApp (opcional)
   nota ........... observação automática do item (ex.: PF aconchego: "proteína a consultar")
   diasDisponiveis  dias da semana em que o item pode ser pedido (0 = domingo ... 6 = sábado, fuso de São Paulo).
                    Fora deles o botão fica desativado ("disponível de segunda a sexta") e, se o item já estava na
                    sacola, ele fica marcado em vinho e o envio é bloqueado até o cliente removê-lo (ex.: PF aconchego)
   diasRotulo ..... os mesmos dias em texto, usado nos avisos: "segunda a sexta"
   {acrescimo} .... dentro de "obs": vira "R$ 5" a partir do preço da opção (o valor nunca é escrito duas vezes)
   ============================================================ */

const CONFIG = {
  // Contatos
  whatsappNumero: "5541984867724",       // só dígitos, com 55 + DDD (recebe os pedidos enviados pela sacola)
  instagramUrl: "https://instagram.com/radicidamore",

  // Página do Radici no iFood (abre em nova aba no cabeçalho e no rodapé). Sem o rastreador "?fbclid=..." do Facebook.
  // Se um dia ficar "", o site esconde o botão do rodapé e mostra o marcador [[PREENCHER: link iFood]].
  ifoodUrl: "https://www.ifood.com.br/delivery/fazenda-rio-grande-pr/radici-damore-eucaliptos/23ac3698-b9a8-4f47-8a84-234a5f3a7844",

  // Endereço: aparece no rodapé, vira link para o Google Maps e gera o mapa embutido sozinho.
  endereco: "R. Jequitibá, 105 - Loja 25, Fazenda Rio Grande - PR, 83820-004",

  // Horários oficiais (fonte: post da cliente no Instagram). Escritos uma vez só: o rodapé, o selo "aberto agora",
  // os avisos de almoço e o botão de enviar o pedido leem estes mesmos valores (js/horarios.js).
  // Formato "H:MM" (24h, fuso America/Sao_Paulo). Para testar: ?dia=terca&hora=12:00 no endereço do site.
  horarios: {
    semana: { rotulo: "Segunda - Sexta",    abre: "8:00",  fecha: "15:00" },   // segunda a sexta
    sabado: { rotulo: "Sábados alternados", abre: "8:30",  fecha: "14:00" },   // só em alguns sábados
    almoco: { rotulo: "Almoço",             abre: "11:00", fecha: "14:00" },   // pratos de "Massas e pratos"
    aviso: "Tudo é feito com tempo, cuidado e carinho. Por isso, em dias de grande movimento, nosso atendimento poderá ser encerrado antes do horário previsto."
  }
};

// PRATO COROADO: removido a pedido da cliente, pode voltar no futuro
// (fica aqui, acima da linha do gerador, para não ser apagado quando rodar tools/gerar-cardapio-data.js).
// Para reativar: primeiro recrie a categoria "Prato destaque" (veja o bloco PRATO DO MÊS logo abaixo), depois acrescente o
// item abaixo nela no radici-cardapio.json, rode node tools/gerar-cardapio-data.js, coloque a foto em
// fotos/ravioli-carne-desfiada.jpg e recoloque o bloco visual no js/main.js (o desenho antigo está no histórico do git,
// commit 2d97166, função do prato destaque).
//   {
//     "id": "ravioli-carne-desfiada",
//     "nome": "Ravioli de carne desfiada",
//     "selo": "Coroado um ano",
//     "descricao": "Massa fresca tipo ravioli recheado de carne desfiada cozida por 12 horas, ao molho da carne com um toque de vinho ou de leite de coco, finalizado com ervilhas verdes e queijo. Serve 1 pessoa.",
//     "preco": 53.9,
//     "categoriaPedido": "massas",
//     "pedivel": true
//   },

// PRATO DO MÊS: removido a pedido da cliente, pode voltar no futuro
// (fica aqui, acima da linha do gerador, para não ser apagado quando rodar tools/gerar-cardapio-data.js).
// Para reativar: (1) devolva o campo "pratoDoMes" ao CONFIG, acima; (2) acrescente a categoria abaixo no radici-cardapio.json,
// entre "Monte sua massa" e "Panquecas Radici", e rode node tools/gerar-cardapio-data.js; (3) recoloque a seção no index.html
// (entre Empanadas e Mensagem da família), o bloco visual e o chip da aba no js/main.js, a regra "nomeConfig" (preço a confirmar e
// nome vindo do CONFIG) no js/pedido.js e a seção 12 do css/style.css. Tudo isso está no histórico do git (commit bb86faf).
//   CONFIG:
//     // Prato do mês (R$ 47,90). Ex.: "Lasanha de abóbora com ricota". Vazio mostra "consulte o prato deste mês".
//     pratoDoMes: "",
//   Categoria do cardápio:
//   {
//     "categoria": "Prato destaque",
//     "itens": [
//       {
//         "id": "prato-do-mes",
//         "nome": "Prato do mês",
//         "descricao": "Todos os meses um prato destaque. Serve 1 pessoa.",
//         "preco": 47.9,
//         "categoriaPedido": "massas",
//         "pedivel": true,
//         "nomeConfig": "pratoDoMes"
//       }
//     ]
//   },
//   Texto de apoio da seção: "O prato que a gente escolhe com carinho a cada mês."

/* ===== CARDÁPIO · gerado de radici-cardapio.json (não edite abaixo desta linha) ===== */
const CARDAPIO = {
  "restaurante": {
    "nome": "Radici d'Amore",
    "tipo": "Bistrò · Massas frescas",
    "instagram": "@radicidamore",
    "whatsapp": "(41) 9 8486-7724",
    "delivery": "iFood",
    "recados": [
      "Estamos muito felizes em receber você em nossa casa!",
      "Trabalhamos com produtos artesanais e frescos, seu preparo pode demandar cerca de 15 a 25 minutos para finalizar.",
      "Pagamentos são feitos diretamente no balcão.",
      "Consulte disponibilidade dos nossos produtos!"
    ]
  },
  "identidade_visual": {
    "cores": {
      "creme_fundo": "#F4E6CD",
      "verde_oliva_textos": "#3D4C23",
      "vermelho_vinho_destaques": "#931A1A",
      "verde_medio_ilustracoes": "#5F6B40"
    },
    "fontes_no_arquivo": {
      "serifada_titulos_e_textos": "Fonde",
      "cursiva_assinatura": "Astina"
    },
    "regra_fontes": "Usar SOMENTE as fontes originais (Fonde e Astina) via @font-face com os arquivos em /fonts. Não substituir.",
    "padrao_de_titulo": "Palavra em serifada verde + palavra em cursiva vermelha sobreposta (ex.: 'Prato do' + 'dia', 'Monte sua' + 'massa')",
    "elementos": "Padrão de fundo ilustrado a traço: massas (farfalle, ravioli, empanada), taças de vinho, corações vermelhos e folhas — verde sobre creme"
  },
  "cardapio": [
    {
      "categoria": "Antipasto",
      "itens": [
        {
          "id": "bolinho-de-carne-assado",
          "nome": "Bolinho de Carne - Assado",
          "descricao": "Bolinho de carne moída com especiarias",
          "preco": 10,
          "unidade": "und.",
          "categoriaPedido": "entradas",
          "pedivel": true,
          "nomePedido": "Bolinho de carne assado"
        },
        {
          "id": "polenta-frita",
          "nome": "Polenta frita",
          "descricao": "Polenta palito com maionese d'amore",
          "categoriaPedido": "entradas",
          "pedivel": true,
          "opcoes": [
            {
              "id": "tamanho",
              "titulo": "Escolha o tamanho",
              "obrigatorio": true,
              "tipo": "unica",
              "itens": [
                {
                  "nome": "Porção pequena",
                  "preco": 17
                },
                {
                  "nome": "Porção grande",
                  "preco": 29
                }
              ],
              "preco": "substitui"
            }
          ]
        },
        {
          "id": "batata-frita",
          "nome": "Batata frita",
          "descricao": "Batata palito com maionese d'amore",
          "categoriaPedido": "entradas",
          "pedivel": true,
          "opcoes": [
            {
              "id": "tamanho",
              "titulo": "Escolha o tamanho",
              "obrigatorio": true,
              "tipo": "unica",
              "itens": [
                {
                  "nome": "Porção pequena",
                  "preco": 19
                },
                {
                  "nome": "Porção grande",
                  "preco": 32
                }
              ],
              "preco": "substitui"
            }
          ]
        }
      ]
    },
    {
      "categoria": "Da Itália à Argentina: Empanadas Argentinas",
      "descricao": "Com uma massa folhada leve e crocante que derrete na boca.",
      "preco_unico": 14,
      "itens": [
        {
          "id": "carne-especial",
          "nome": "Carne especial",
          "descricao": "Carne, ovo cozido, cebola, um toque de barbecue e finalizado com temperos frescos",
          "categoriaPedido": "empanadas",
          "pedivel": true
        },
        {
          "id": "carne-com-cheddar",
          "nome": "Carne com cheddar",
          "descricao": "Carne, cheddar, pepino agridoce e especiarias",
          "categoriaPedido": "empanadas",
          "pedivel": true
        },
        {
          "id": "frango-bechamel",
          "nome": "Frango Bechamel",
          "descricao": "Frango desfiado com molho bechamel e um pouco de cebola",
          "categoriaPedido": "empanadas",
          "pedivel": true
        },
        {
          "id": "porco-e-mostarda",
          "nome": "Porco e mostarda",
          "descricao": "Porco desfiado, cebola, mostarda, mel e especiarias",
          "categoriaPedido": "empanadas",
          "pedivel": true
        },
        {
          "id": "linguica-parrilheira",
          "nome": "Linguiça parrilheira",
          "descricao": "Linguiça toscana, cebola e requeijão",
          "categoriaPedido": "empanadas",
          "pedivel": true
        },
        {
          "id": "espinafre-e-ricota",
          "nome": "Espinafre e ricota",
          "descricao": "Espinafre, ricota e requeijão",
          "categoriaPedido": "empanadas",
          "pedivel": true
        },
        {
          "id": "gorgonzola-e-nozes",
          "nome": "Gorgonzola e nozes",
          "descricao": "Queijo gorgonzola, mussarela e nozes",
          "categoriaPedido": "empanadas",
          "pedivel": true
        },
        {
          "id": "queijo-argentino-e-cebola",
          "nome": "Queijo argentino e cebola",
          "descricao": "Queijo mussarela autêntico 100% argentino, cebola e finalizado com temperos frescos",
          "categoriaPedido": "empanadas",
          "pedivel": true
        }
      ]
    },
    {
      "categoria": "Prato do dia",
      "descricao": "Todos os dias um prato promocional. Serve 1 pessoa.",
      "preco_unico": 31.9,
      "itens": [
        {
          "id": "prato-dia-segunda",
          "dia": "Segunda",
          "nome": "Spaghetti ao molho bechamel e peito de frango",
          "descricao": "Massa fresca ao molho branco e peito de frango",
          "categoriaPedido": "massas",
          "pedivel": true,
          "nomePedido": "Prato do dia · Spaghetti ao molho bechamel e peito de frango"
        },
        {
          "id": "prato-dia-terca",
          "dia": "Terça",
          "nome": "Macarrão ao pomodoro e tiras de carne",
          "descricao": "Massa fresca ao molho de tomate e especiarias, servida com tiras de carne bovina",
          "categoriaPedido": "massas",
          "pedivel": true,
          "nomePedido": "Prato do dia · Macarrão ao pomodoro e tiras de carne"
        },
        {
          "id": "prato-dia-quarta",
          "dia": "Quarta",
          "nome": "Ravioli ou Tortéi ao molho de frango",
          "descricao": "Massa fresca recheada de creme de queijos ou de moranga cabotiá, servida ao molho pomodoro e frango em pedaços",
          "categoriaPedido": "massas",
          "pedivel": true,
          "nomePedido": "Prato do dia · Ravioli ou Tortéi ao molho de frango",
          "opcoes": [
            {
              "id": "recheio",
              "titulo": "Escolha o recheio",
              "obrigatorio": true,
              "tipo": "unica",
              "itens": [
                {
                  "nome": "Ravioli",
                  "obs": "recheado de creme de queijos"
                },
                {
                  "nome": "Tortéi",
                  "obs": "recheado de moranga cabotiá"
                }
              ]
            }
          ]
        },
        {
          "id": "prato-dia-quinta",
          "dia": "Quinta",
          "nome": "À carbonara",
          "descricao": "Massa fresca tipo talharim, spaghetti ou macarrão, servida com bacon, emulsão de ovos e queijo parmesão",
          "categoriaPedido": "massas",
          "pedivel": true,
          "nomePedido": "Prato do dia · À carbonara",
          "opcoes": [
            {
              "id": "massa",
              "titulo": "Escolha a massa",
              "obrigatorio": true,
              "tipo": "unica",
              "itens": [
                {
                  "nome": "Talharim"
                },
                {
                  "nome": "Spaghetti"
                },
                {
                  "nome": "Macarrão"
                }
              ]
            },
            {
              "id": "pimenta",
              "titulo": "Pimenta",
              "obrigatorio": true,
              "tipo": "unica",
              "erro": "Escolha com ou sem pimenta",
              "minuscula": true,
              "itens": [
                {
                  "nome": "Com pimenta"
                },
                {
                  "nome": "Sem pimenta"
                }
              ]
            }
          ]
        },
        {
          "id": "prato-dia-sexta",
          "dia": "Sexta",
          "nome": "Lasanha à bolonhesa, frango, queijos ou queijos com bacon",
          "descricao": "Massa fresca em camadas intercaladas ao molho bolonhesa | ao molho de frango | ao molho de queijos | ao molho de queijos com bacon. Somente na sexta-feira.",
          "categoriaPedido": "massas",
          "pedivel": true,
          "nomePedido": "Prato do dia · Lasanha",
          "opcoes": [
            {
              "id": "molho",
              "titulo": "Escolha o molho",
              "obrigatorio": true,
              "tipo": "unica",
              "itens": [
                {
                  "nome": "Bolonhesa"
                },
                {
                  "nome": "Frango"
                },
                {
                  "nome": "Queijos"
                },
                {
                  "nome": "Queijos com bacon"
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "categoria": "Monte sua massa",
      "id": "monte-sua-massa",
      "categoriaPedido": "massas",
      "pedivel": true,
      "passo_1_massas": [
        {
          "id": "monte-massa-spaghetti",
          "nome": "Spaghetti"
        },
        {
          "id": "monte-massa-macarrao",
          "nome": "Macarrão"
        },
        {
          "id": "monte-massa-talharim",
          "nome": "Talharim"
        },
        {
          "id": "monte-massa-ravioli",
          "nome": "Ravioli",
          "obs": "recheado de creme de queijos"
        },
        {
          "id": "monte-massa-tortei",
          "nome": "Tortéi",
          "obs": "recheado de moranga cabotiá"
        }
      ],
      "passo_2_molhos": [
        {
          "id": "monte-molho-molho-pomodoro",
          "nome": "Molho pomodoro",
          "preco": 35
        },
        {
          "id": "monte-molho-molho-bechamel",
          "nome": "Molho bechamel",
          "preco": 35
        },
        {
          "id": "monte-molho-molho-de-frango",
          "nome": "Molho de frango",
          "preco": 35
        },
        {
          "id": "monte-molho-a-caprese",
          "nome": "À caprese",
          "preco": 35
        },
        {
          "id": "monte-molho-a-alho-e-oleo",
          "nome": "À alho e óleo",
          "preco": 35
        },
        {
          "id": "monte-molho-molho-carbonara",
          "nome": "Molho carbonara",
          "preco": 37
        },
        {
          "id": "monte-molho-molho-ragu",
          "nome": "Molho ragu",
          "preco": 37
        },
        {
          "id": "monte-molho-molho-de-queijos",
          "nome": "Molho de queijos",
          "preco": 37
        },
        {
          "id": "monte-molho-molho-bolonhesa",
          "nome": "Molho bolonhesa",
          "preco": 37
        },
        {
          "id": "monte-molho-molho-alfredo",
          "nome": "Molho alfredo",
          "preco": 37
        }
      ],
      "pimenta": {
        "molho": "monte-molho-molho-carbonara",
        "id": "pimenta",
        "titulo": "Pimenta",
        "obrigatorio": true,
        "tipo": "unica",
        "erro": "Escolha com ou sem pimenta",
        "minuscula": true,
        "itens": [
          {
            "nome": "Com pimenta"
          },
          {
            "nome": "Sem pimenta"
          }
        ]
      },
      "passo_3_adicionais": [
        {
          "id": "monte-adicional-bacon",
          "nome": "Bacon",
          "preco": 6
        },
        {
          "id": "monte-adicional-calabresa-ralada",
          "nome": "Calabresa ralada",
          "preco": 6
        },
        {
          "id": "monte-adicional-peito-de-frango",
          "nome": "Peito de frango",
          "preco": 10
        },
        {
          "id": "monte-adicional-bolinho-de-carne",
          "nome": "Bolinho de carne",
          "preco": 10
        },
        {
          "id": "monte-adicional-tiras-de-carne",
          "nome": "Tiras de carne",
          "preco": 17
        },
        {
          "id": "monte-adicional-contrafile",
          "nome": "Contrafilé",
          "preco": 23
        }
      ]
    },
    {
      "categoria": "Panquecas Radici",
      "descricao": "Escolha o recheio. Serve 1 pessoa.",
      "preco_unico": 34.9,
      "recheios": [
        "Molho de queijos com bacon",
        "Bolonhesa",
        "Frango",
        "Ragu de carne",
        "Romeu & Julieta",
        "Chocolate ao leite"
      ],
      "itens": [
        {
          "id": "panquecas-radici",
          "nome": "Panquecas Radici",
          "categoriaPedido": "massas",
          "pedivel": true,
          "opcoes": [
            {
              "id": "recheio",
              "titulo": "Escolha o recheio",
              "obrigatorio": true,
              "tipo": "unica",
              "itens": [],
              "itensDe": "recheios"
            }
          ]
        }
      ]
    },
    {
      "categoria": "Risotto speciale",
      "itens": [
        {
          "id": "risotto-de-queijos",
          "rotulo": "Risotto uno",
          "nome": "Risotto de queijos",
          "descricao": "Risotto cremoso com parmesão, mussarela e gorgonzola. Serve 1 pessoa.",
          "preco": 47.9,
          "categoriaPedido": "massas",
          "pedivel": true
        },
        {
          "id": "risotto-alho-poro-com-limao-siciliano",
          "rotulo": "Risotto due",
          "nome": "Risotto alho-poró com limão siciliano",
          "descricao": "Risotto suave com alho-poró e toque refrescante de limão siciliano. Serve 1 pessoa.",
          "preco": 47.9,
          "categoriaPedido": "massas",
          "pedivel": true
        },
        {
          "id": "risotto-de-linguica-e-alho-poro",
          "rotulo": "Risotto tre",
          "nome": "Risotto de linguiça e alho-poró",
          "descricao": "Risotto cremoso com linguiça blumenau e alho-poró. Serve 1 pessoa.",
          "preco": 47.9,
          "categoriaPedido": "massas",
          "pedivel": true
        }
      ]
    },
    {
      "categoria": "Piatto per due",
      "opcoes": [
        {
          "id": "massa",
          "titulo": "Escolha a massa",
          "obrigatorio": true,
          "tipo": "unica",
          "itens": [
            {
              "nome": "Talharim"
            },
            {
              "nome": "Macarrão"
            },
            {
              "nome": "Spaghetti"
            },
            {
              "nome": "Ravioli",
              "preco": 5
            },
            {
              "nome": "Tortéi",
              "preco": 5
            }
          ]
        }
      ],
      "itens": [
        {
          "id": "massa-fresca-ao-molho-de-queijos-e-contrafile",
          "rotulo": "Piatto uno",
          "nome": "Massa fresca ao molho de queijos e contrafilé",
          "descricao": "Massa fresca tipo talharim, macarrão ou spaghetti ao molho de quatro queijos, acompanha contrafilé grelhado. Serve 2 pessoas.",
          "preco": 105,
          "obs": "Massa tipo ravioli ou tortéi + {acrescimo}",
          "categoriaPedido": "massas",
          "pedivel": true
        },
        {
          "id": "massa-fresca-ao-molho-pomodoro-e-frango",
          "rotulo": "Piatto due",
          "nome": "Massa fresca ao molho pomodoro e frango",
          "descricao": "Talharim, macarrão ou spaghetti ao molho pomodoro, acompanha filés de frango. Serve 2 pessoas.",
          "preco": 95,
          "obs": "Massa tipo ravioli ou tortéi + {acrescimo}",
          "categoriaPedido": "massas",
          "pedivel": true
        }
      ]
    },
    {
      "categoria": "PF aconchego",
      "itens": [
        {
          "id": "pf-aconchego",
          "nome": "PF aconchego",
          "descricao": "Arroz, feijão, farofa caseira, salada e consulte proteína disponível. Serve 1 pessoa.",
          "preco": 28.9,
          "categoriaPedido": "massas",
          "pedivel": true,
          "nota": "proteína a consultar",
          "diasDisponiveis": [
            1,
            2,
            3,
            4,
            5
          ],
          "diasRotulo": "segunda a sexta"
        }
      ]
    },
    {
      "categoria": "Prato kids",
      "itens": [
        {
          "id": "massa-fresca",
          "nome": "Massa fresca",
          "descricao": "Massa fresca tipo macarrão, acompanha molho bolonhesa, bechamel ou pomodoro.",
          "preco": null,
          "categoriaPedido": "massas",
          "pedivel": true,
          "nomePedido": "Massa fresca kids",
          "opcoes": [
            {
              "id": "molho",
              "titulo": "Escolha o molho",
              "obrigatorio": true,
              "tipo": "unica",
              "itens": [
                {
                  "nome": "Bolonhesa"
                },
                {
                  "nome": "Bechamel"
                },
                {
                  "nome": "Pomodoro"
                }
              ]
            }
          ]
        },
        {
          "id": "pf-aconchego-kids",
          "nome": "PF aconchego kids",
          "descricao": "Arroz, feijão, tiras de carne ou peito de frango.",
          "preco": 20.9,
          "categoriaPedido": "massas",
          "pedivel": true,
          "opcoes": [
            {
              "id": "proteina",
              "titulo": "Escolha a proteína",
              "obrigatorio": true,
              "tipo": "unica",
              "itens": [
                {
                  "nome": "Tiras de carne"
                },
                {
                  "nome": "Peito de frango"
                }
              ]
            }
          ],
          "diasDisponiveis": [
            1,
            2,
            3,
            4,
            5
          ],
          "diasRotulo": "segunda a sexta"
        }
      ]
    },
    {
      "categoria": "Adicionais",
      "itens": [
        {
          "id": "arroz-individual",
          "nome": "Arroz individual",
          "preco": 5,
          "categoriaPedido": "adicionais",
          "pedivel": true
        },
        {
          "id": "feijao-individual",
          "nome": "Feijão individual",
          "preco": 5,
          "categoriaPedido": "adicionais",
          "pedivel": true
        },
        {
          "id": "farofa-individual",
          "nome": "Farofa individual",
          "preco": 5,
          "categoriaPedido": "adicionais",
          "pedivel": true
        },
        {
          "id": "salada-do-dia-individual",
          "nome": "Salada do dia - individual",
          "preco": 8,
          "categoriaPedido": "adicionais",
          "pedivel": true
        },
        {
          "id": "salada-do-dia-prato",
          "nome": "Salada do dia - prato",
          "preco": 13,
          "categoriaPedido": "adicionais",
          "pedivel": true
        }
      ]
    },
    {
      "categoria": "Dolce",
      "obs": "Nossas sobremesas são todas artesanais, consulte a disponibilidade.",
      "itens": [
        {
          "id": "tiramisu",
          "nome": "Tiramisù",
          "descricao": "Bolacha champanhe, creme de chocolate com café e creme de baunilha",
          "preco": 13.9,
          "unidade": "und.",
          "categoriaPedido": "sobremesas",
          "pedivel": true
        },
        {
          "id": "torta-mineira-do-sul",
          "nome": "Torta Mineira do Sul",
          "descricao": "Bolo de pão de ló, recheada com um creme feito à base de leite condensado e abacaxi, finalizado com chantilly de nata",
          "preco": 13.9,
          "unidade": "und.",
          "categoriaPedido": "sobremesas",
          "pedivel": true
        },
        {
          "id": "brownie-de-chocolate",
          "nome": "Brownie de chocolate",
          "descricao": "Bolo de textura densa e úmida, com uma crosta levemente crocante",
          "preco": 16,
          "unidade": "und.",
          "categoriaPedido": "sobremesas",
          "pedivel": true
        },
        {
          "id": "brownie-de-chocolate-c-dulce-de-leche",
          "nome": "Brownie de chocolate c/ dulce de leche",
          "descricao": "Bolo de textura densa e úmida, com uma crosta levemente crocante e calda de dulce de leche",
          "preco": 18,
          "unidade": "und.",
          "categoriaPedido": "sobremesas",
          "pedivel": true
        },
        {
          "id": "brownie-de-chocolate-c-sorvete",
          "nome": "Brownie de chocolate c/ sorvete",
          "descricao": "Bolo de textura densa e úmida, com uma crosta levemente crocante, com uma bola de sorvete de creme e calda de dulce de leche",
          "preco": 22,
          "unidade": "und.",
          "categoriaPedido": "sobremesas",
          "pedivel": true
        },
        {
          "id": "pudim-de-leite",
          "nome": "Pudim de leite",
          "descricao": "Leite condensado, leite e ovos, finalizado com calda de caramelo",
          "preco": 10,
          "unidade": "fatia",
          "categoriaPedido": "sobremesas",
          "pedivel": true
        },
        {
          "id": "bolo-caseiro",
          "nome": "Bolo caseiro",
          "descricao": "Consulte sabor disponível",
          "preco": 10,
          "unidade": "fatia",
          "categoriaPedido": "sobremesas",
          "pedivel": true,
          "nota": "sabor a consultar"
        },
        {
          "id": "alfajor",
          "nome": "Alfajor",
          "descricao": "Chocolate preto | branco | maisena, recheado de dulce de leche argentino",
          "preco": 12,
          "unidade": "und.",
          "categoriaPedido": "sobremesas",
          "pedivel": true,
          "opcoes": [
            {
              "id": "tipo",
              "titulo": "Escolha o tipo",
              "obrigatorio": true,
              "tipo": "unica",
              "itens": [
                {
                  "nome": "Chocolate preto"
                },
                {
                  "nome": "Chocolate branco"
                },
                {
                  "nome": "Maisena"
                }
              ]
            }
          ]
        },
        {
          "id": "medialuna",
          "nome": "Medialuna",
          "descricao": "Pãozinho tradicional argentino, feito de massa folhada com manteiga, macia e doce",
          "preco": 8.5,
          "unidade": "und.",
          "categoriaPedido": "sobremesas",
          "pedivel": true
        },
        {
          "id": "medialuna-c-dulce-de-leche",
          "nome": "Medialuna c/ dulce de leche",
          "descricao": "Pãozinho tradicional argentino, feito de massa folhada com manteiga, macia e doce, recheada com dulce de leche argentino",
          "preco": 10,
          "unidade": "und.",
          "categoriaPedido": "sobremesas",
          "pedivel": true
        }
      ]
    },
    {
      "categoria": "Bevande",
      "itens": [
        {
          "id": "expresso",
          "nome": "Expresso",
          "preco": 4.5,
          "categoriaPedido": "bebidas",
          "pedivel": true
        },
        {
          "id": "agua-mineral",
          "nome": "Água mineral",
          "obs": "com ou sem gás",
          "preco": 4.5,
          "categoriaPedido": "bebidas",
          "pedivel": true,
          "opcoes": [
            {
              "id": "gas",
              "titulo": "Com ou sem gás?",
              "obrigatorio": true,
              "tipo": "unica",
              "itens": [
                {
                  "nome": "Com gás"
                },
                {
                  "nome": "Sem gás"
                }
              ]
            }
          ]
        },
        {
          "id": "suco-kapo",
          "nome": "Suco Kapo",
          "preco": 3.5,
          "categoriaPedido": "bebidas",
          "pedivel": true
        },
        {
          "id": "suco-natural",
          "nome": "Suco natural",
          "obs": "consultar sabores disponíveis",
          "preco": 15,
          "categoriaPedido": "bebidas",
          "pedivel": true,
          "opcoes": [
            {
              "id": "sabor",
              "titulo": "Qual sabor?",
              "obrigatorio": true,
              "tipo": "texto",
              "dica": "consulte os sabores disponíveis no balcão"
            }
          ]
        },
        {
          "id": "suco-de-uva-integral",
          "nome": "Suco de uva integral",
          "obs": "tinto ou branco",
          "preco": 15,
          "categoriaPedido": "bebidas",
          "pedivel": true,
          "opcoes": [
            {
              "id": "tipo",
              "titulo": "Tinto ou branco?",
              "obrigatorio": true,
              "tipo": "unica",
              "itens": [
                {
                  "nome": "Tinto"
                },
                {
                  "nome": "Branco"
                }
              ]
            }
          ]
        },
        {
          "id": "soda-italiana-monin",
          "nome": "Soda italiana Monin",
          "obs": "consultar sabores disponíveis",
          "preco": 17,
          "categoriaPedido": "bebidas",
          "pedivel": true,
          "opcoes": [
            {
              "id": "sabor",
              "titulo": "Qual sabor?",
              "obrigatorio": true,
              "tipo": "texto",
              "dica": "consulte os sabores disponíveis no balcão"
            }
          ]
        },
        {
          "id": "refrigerante-200ml",
          "nome": "Refrigerante 200ml",
          "preco": 3.5,
          "categoriaPedido": "bebidas",
          "pedivel": true,
          "opcoes": [
            {
              "id": "sabor",
              "titulo": "Qual sabor?",
              "obrigatorio": true,
              "tipo": "texto",
              "dica": "consulte os sabores disponíveis no balcão"
            }
          ]
        },
        {
          "id": "refrigerante-lata-ou-cha-copo",
          "nome": "Refrigerante lata ou chá copo",
          "preco": 6,
          "categoriaPedido": "bebidas",
          "pedivel": true,
          "opcoes": [
            {
              "id": "tipo",
              "titulo": "Refrigerante lata ou chá copo?",
              "obrigatorio": true,
              "tipo": "unica",
              "itens": [
                {
                  "nome": "Refrigerante lata"
                },
                {
                  "nome": "Chá copo"
                }
              ],
              "viraNome": true
            },
            {
              "id": "sabor",
              "titulo": "Qual sabor?",
              "obrigatorio": true,
              "tipo": "texto",
              "dica": "consulte os sabores disponíveis no balcão"
            }
          ]
        },
        {
          "id": "refrigerante-600ml",
          "nome": "Refrigerante 600ml",
          "preco": 8.5,
          "categoriaPedido": "bebidas",
          "pedivel": true,
          "opcoes": [
            {
              "id": "sabor",
              "titulo": "Qual sabor?",
              "obrigatorio": true,
              "tipo": "texto",
              "dica": "consulte os sabores disponíveis no balcão"
            }
          ]
        },
        {
          "id": "energetico",
          "nome": "Energético",
          "preco": 12.5,
          "categoriaPedido": "bebidas",
          "pedivel": true
        },
        {
          "id": "taca-de-vinho",
          "nome": "Taça de vinho",
          "obs": "vinho colonial da Serra Gaúcha",
          "preco": 18.5,
          "categoriaPedido": "bebidas",
          "pedivel": true
        },
        {
          "id": "cerveja-lata-brahma-puro-malte",
          "nome": "Cerveja lata - Brahma puro malte",
          "preco": 8.5,
          "categoriaPedido": "bebidas",
          "pedivel": true
        },
        {
          "id": "cerveja-lata-brahma",
          "nome": "Cerveja lata - Brahma",
          "preco": 6.5,
          "categoriaPedido": "bebidas",
          "pedivel": true
        },
        {
          "id": "cerveja-lata-antarctica-original",
          "nome": "Cerveja lata - Antarctica original",
          "preco": 6.5,
          "categoriaPedido": "bebidas",
          "pedivel": true
        }
      ]
    }
  ]
};
