# Translation Review

This review compares the English source UI copy with the Hindi, Telugu, and Simplified Chinese localizations in `frontend/vedic-guide.jsx`. Overall, the localizations preserve the tone and intent well. The items below were the translations that materially drifted from the English meaning and have been corrected.

## Corrected meaning drifts

| Key / area | English source meaning | Previous localized meaning | Resolution |
| --- | --- | --- | --- |
| `auth_pending_note` | Guests may ask up to 10 questions per day; registering a passkey and being allowlisted gives unlimited access. | Hindi, Telugu, and Chinese said access was limited until admin approval and allowed only one question now. | Updated all three languages to preserve the daily 10-question guest allowance and the unlimited-access allowlist path. |
| `auth_limit_title` | The guest has reached today's free questions. | Hindi and Telugu implied a single free question had been used, not a daily quota. Chinese was close but less explicit about “today.” | Updated all three languages to state that today's free questions are used up. |
| `auth_limit_p` | Guests receive 10 questions per day; register a passkey and ask the admin for unlimited access. | Hindi, Telugu, and Chinese omitted the 10-question-per-day allowance and/or unlimited-access path. | Updated all three languages to include both the quota and the path to unlimited access. |
| `SUGGESTIONS.*` “Family vs. honesty” | The ethical tension is specifically “family before honesty at work.” | Hindi, Telugu, and Chinese omitted “at work,” broadening the question into a general family-vs-truth dilemma. | Updated all three languages to include the work context. |

## Notes from the review

- The remaining Hindi, Telugu, and Chinese strings generally carry the English intent rather than translating word-for-word, which is appropriate for this UI's reflective tone.
- Several spiritual terms are transliterated or culturally adapted (`śruti`, `smṛti`, `dharma`, `ātman`, etc.). These choices are acceptable because the UI already treats Sanskrit terms as primary concepts and explains them in each language.
- Some minor style differences remain, such as “guide” being gendered or personified differently by language. These do not change the core meaning.
