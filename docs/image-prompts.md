# Remaining image prompts

Items 1 to 3 (story hero, lunch table, raw mangoes) are already generated. These are items 4 to 20.
Paste each prompt into ChatGPT as a new image request. Save to `apps/storefront/public/images/<page>/<file>.webp`.

## Style block (end of every prompt)

> **Brand rule (owner, 2026-11-22): heritage luxury, never homely.** Every image is a premium heritage still life, like the Our Story close band: one hero jar or dish on a solid base (stone, marble or travertine plinth or slab) in a clean premium studio with ONE solid deep backdrop colour (forest green by default; never a multi-colour gradient), dramatic warm side light, generous negative space, at most 1–2 crisp props (fresh produce, a brass or terracotta dish). Never fabric of any kind and never antique or carved furniture. No everyday domestic scenes: no window sills, doorways, slippers, tiffin carriers, gamcha, steel utensils or cluttered kitchens. The prompts below that still say "home kitchen", "family table" or "steel plate" predate this rule: restyle them before generating.

> Photorealistic editorial food photograph, heritage-luxury still life. Deep, rich palette from the brand (raw-mango green #2b4103, moss #5e6848, linen cream #e8e5d5 highlights, a mustard-yellow #f5d84c accent). Realistic texture, crisp and appetising food. No text, labels, logos, watermarks or brand names. No people or hands. Aspect ratio exactly {RATIO}.

Replace `{RATIO}` with the ratio in each row. Desktop and mobile ratios differ on some slots: generate at the desktop ratio, then crop a `-mob` version.

## Our story

| #   | File                                 | Desktop / mobile ratio | Output px | Prompt subject                                                                                                                                                           |
| --- | ------------------------------------ | ---------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4   | `our-story/craft-spices-oil.webp`    | 1:1 / 4:3              | 718x718   | Whole spices (cumin, mustard seed, dried chilli, fennel) on a stone slab beside a small bowl of golden mustard oil.                                                      |
| 5   | `our-story/craft-hands.webp`         | 4:5 / 4:3              | 718x898   | Hands mixing raw mango pieces and spice in a wide bowl, close crop, soft side light.                                                                                     |
| 6   | `our-story/story-shared-meal.webp`   | 4:5 / 5:4              | 870x1088  | A glass jar of achar passed across a family table, one older hand giving and one younger hand receiving. Crop below the shoulders, no faces. Warm window light, unposed. |
| 7   | `our-story/story-jars-on-table.webp` | 21:9 / 4:3             | 2100x900  | Four unlabelled glass jars of achar on a table with a bowl of rice and a cloth napkin, warm window light.                                                                |

## Recipes

| #   | File                         | Ratio              | Output px | Prompt subject                                                                                                            |
| --- | ---------------------------- | ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| 8   | `recipes/recipes-intro.webp` | 5:4                | 970x776   | A steel plate of steaming khichuri, a small bowl of achar and a lemon wedge, seen from a slight angle. Warm window light. |
| 9   | `recipes/pair-dal-bhat.webp` | 4:5 desk / 4:3 mob | 706x883   | Dal and rice on a plate with a lemon pickle on the rim and a green chilli beside it.                                      |
| 10  | `recipes/pair-khichuri.webp` | 4:5 / 4:3          | 706x883   | Khichuri in a brass bowl with a spoonful of mango achar on the side.                                                      |
| 11  | `recipes/pair-porota.webp`   | 4:5 / 4:3          | 706x883   | Folded porota on a plate with a spicy pickle in a small saucer.                                                           |

## Recipe details (khichuri)

| #   | File                                       | Ratio | Output px | Prompt subject                                                                                                                                                                                                        |
| --- | ------------------------------------------ | ----- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12  | `recipes/recipe-khichuri-hero.webp`        | 4:3   | 1234x926  | Bhuna khichuri in a brass bowl, steam rising, a fried egg and a lemon wedge beside it, a small dish of mango achar at the edge. Warm window light from the left, slightly overhead angle. Steel spoon resting nearby. |
| 13  | `recipes/recipe-khichuri-ingredients.webp` | 16:10 | 1200x750  | Close-up of dry ingredients on a steel plate: roasted moong dal, rice, a few bay leaves, green chillies. Natural side light, nothing styled.                                                                          |
| 14  | `recipes/recipe-khichuri-step3.webp`       | 3:2   | 900x600   | Sliced onion turning golden in ghee in a heavy pot, one bay leaf visible. Close crop, steam and shine, daylight.                                                                                                      |
| 15  | `recipes/recipe-khichuri-step6.webp`       | 3:2   | 900x600   | Khichuri at a gentle simmer in a heavy pot, lid half open, steam rising. Thick and glossy texture.                                                                                                                    |

## Recipe cards (from seed `imageAlt`)

All 4:3, 720x540.

| #   | File                                  | Prompt subject                                                                      |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------- |
| 16  | `recipes/recipe-porota-alur-dom.webp` | Torn porota beside a bowl of dark alur dom, close crop on texture.                  |
| 17  | `recipes/recipe-jhalmuri.webp`        | Jhalmuri in a paper cone, chopped onion and green chilli visible, natural daylight. |
| 18  | `recipes/recipe-dal-bhat.webp`        | A white enamel plate: rice, dal, alu bharta with mustard oil, a green chilli.       |
| 19  | `recipes/recipe-luchi.webp`           | Puffed luchi in a cane basket, a bowl of pale potato curry beside it.               |
| 20  | `recipes/recipe-achari-sabji.webp`    | Stir-fried vegetables in a kadai, glossy with oil, a spoon resting on the rim.      |

## Notes

- Recipe photos (12 to 20) are read from the database, so using them means setting `imageUrl` in `packages/db/src/seed.ts`.
- Alt text comes from each slot's artboard label or seed `imageAlt`.
- Keep files under about 300 KB after converting to WebP.
