# Regenerating the captain's announcements

The announcements live in `content/cabin.json` (`announcements[]`, one per leg id plus `welcome`). The audio in
`public/audio/captain/<id>.mp3` was made with Gemini text-to-speech and then filtered to sound like a cabin PA.

```bash
# one announcement; repeat per id
ID=welcome
TEXT=$(jq -r ".announcements[] | select(.id==\"$ID\") | .text" content/cabin.json)
STYLE="Read this as an airline captain making a cabin announcement over the PA: warm, unhurried, a little dry humour, clear diction, slight pauses at commas. Do not add any words. "
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "$(jq -n --arg t "$STYLE$TEXT" '{contents:[{parts:[{text:$t}]}],generationConfig:{responseModalities:["AUDIO"],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:"Charon"}}}}}')" \
  | jq -r '.candidates[0].content.parts[0].inlineData.data' | base64 -d > /tmp/$ID.raw
ffmpeg -y -f s16le -ar 24000 -ac 1 -i /tmp/$ID.raw \
  -af "highpass=f=120,lowpass=f=6500,acompressor=threshold=-18dB:ratio=3:attack=10:release=120,volume=1.4" \
  -codec:a libmp3lame -q:a 6 public/audio/captain/$ID.mp3
```

The score (`public/audio/music.mp3`) came from Lyria (`lyria-3.5`) with the prompt: "Instrumental only. A calm, warm
ambient piece for a night flight: soft synth pads, a slow bossa nova guitar figure far in the background, a hint of
airline cabin hum, gentle Rhodes piano, no drums, no vocals. Loopable, 60 seconds."
