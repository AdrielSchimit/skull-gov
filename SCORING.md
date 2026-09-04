# Scoring

O score é determinístico e explicável. Cada oportunidade persiste as linhas de explicação exibidas na tela.

| Dimensão | Pontos |
| --- | ---: |
| Aderência técnica | 0–30, com penalidade por hardware |
| Capital de giro | 0–15 |
| Distância/logística | 0–10 |
| Valor compatível | 0–10 |
| Barreira de habilitação | 0–10 |
| Prazo disponível | 0–5 |
| ME/EPP | 0–5 |
| Concorrência estimada | 0–5 |
| Risco de pagamento | 0–5 |
| Complexidade | 0–5 |

O total é limitado a 0–100. `ATACAR` requer score ≥ 70 e capital baixo; `ANALISAR` cobre score ≥ 45 sem capital crítico; os demais casos são `EVITAR`.

Pay Risk permanece `null` (“dados insuficientes”) porque o resumo público de uma contratação não comprova atraso, dotação, cronograma de pagamento ou desembolso. O Competition Risk usa modalidade, meio eletrônico, valor, especificidade e prazo; é sempre mostrado como estimativa.

`CAIXA RÁPIDO` exige score ≥ 70, capital baixo, valor entre R$ 5 mil e R$ 200 mil e distância ≤ 200 km ou sinais de execução remota. `PRA IR DE CARRO` usa distância ≤ 200 km. Distâncias são calculadas com Haversine para cidades catalogadas; cidade sem coordenada fica `null`, nunca recebe distância inventada.
