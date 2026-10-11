// Stress: long names, many songs, a bigger band. Laid over band.js, in the
// same script, so PAST, pastTakes, api and the rest are band.js's own: a
// test asks for it with openBandApp(page, { stress: true }) (app.ts), and
// every other page keeps the band as it is. From the start screen's
// mockups (design-system/screen-start/q4), where it showed each way of
// keeping a long name whole.
{
  // Last time: thirteen songs, two of them with long names, one of those
  // with a long note, the other longer than two lines of its row.
  const tue = PAST['/rec/tue'];
  // A name longer than two lines of the card, so every way has one to cut.
  tue[0] = 'Tuesday jam at the old brewery, with the horn section and the choir from upstairs';
  tue[3].splice(10, 0,
    ['Dancing barefoot on the roof of the old brewery', 312,
      [{at: 80, note: 'the second verse drags, count it in faster next time', label_id: 4}]],
    ['Dancing barefoot on the roof of the old brewery 2', 298,
      [{at: 200, note: 'this one is the take', label_id: 2}]],
    ['Kalychanka (slow version for the wedding, with the long intro the bride asked for)', 240, []],
    ['Zorka', 180, []], ['Zorka 2', 176, []], ['Zorka 3', 190, []], ['Zorka 4', 185, []],
    ['Zorka 5', 170, []], ['Zorka 6', 182, []], ['Zorka 7', 188, []], ['Zorka 8', 179, []],
    ['Vecharyna', 222, []],
    ['Ranica', 205, []], ['Ranica 2', 210, []],
    ['Kupalle', 260, []], ['Žniŭnaja', 233, []], ['Kalada', 248, []]);

  // Not played last time: seven, so five show and "and 2 more"; one with a
  // long name and a ★ go from another evening, the longest line there is.
  const lastTime = api.last_time;
  api.last_time = async () => {
    const r = await lastTime();
    const before = pastTakes('/rec/tue-before');
    const sat = pastTakes('/rec/sat');
    const at = (folder, rehearsal, created_at, take) => ({folder, rehearsal, created_at, take});
    const TUE = ['/rec/tue-before', 'Tuesday jam', '2026-09-15T19:00:00'];
    const SAT = ['/rec/sat', 'New songs', '2026-09-19T15:00:00'];
    // The ★ goes made up here are copies of other takes, so each is given
    // the song and go its name says, or it would still be that take's.
    const starred = {...before[7], name: 'Lullaby for a drummer who never sleeps 3',
                     song: 'Lullaby for a drummer who never sleeps', go: 3, starred: true};
    const extra = [
      {name: 'Lullaby for a drummer who never sleeps', folder: SAT[0], rehearsal: SAT[1],
       created_at: SAT[2], goes: 5, take: sat[1], plays: at(...TUE, starred)},
      {name: 'Daroha', folder: TUE[0], rehearsal: TUE[1], created_at: TUE[2], goes: 2,
       take: before[8], plays: at(...TUE, before[8])},
      {name: 'Skrypka', folder: TUE[0], rehearsal: TUE[1], created_at: TUE[2], goes: 1,
       take: before[3], plays: at(...TUE, before[3])},
      {name: 'Navalnica', folder: SAT[0], rehearsal: SAT[1], created_at: SAT[2], goes: 3,
       take: sat[4], plays: at(...SAT, sat[4])},
      {name: 'Kryničnaja', folder: SAT[0], rehearsal: SAT[1], created_at: SAT[2], goes: 2,
       take: sat[5], plays: at(...SAT, sat[5])}];
    // Dym's ★ go from another evening: its line is the one that squeezed
    // "Dym" to "D…" in the left part (project memory, 2026-10-07).
    const dym = {...r.not_played[0],
      plays: at(...TUE, {...before[2], name: 'Dym 2', song: 'Dym', go: 2, starred: true})};
    return {...r, not_played: [dym, extra[0], r.not_played[1], ...extra.slice(1)]};
  };

  // Five tracks: the drummer on Both from the kit, a long name, keys on MIDI.
  window.__MIDI_PLAYED__ = ['TD-17', 'Launchkey Mini MK3'];
  api.load_default_tracks = async () => ({tracks: [
    {name: 'Drums', channel: 1, icon: 'drums', stereo: false, mode: 'both', midi_port: {name: 'TD-17'}},
    {name: 'Bass', channel: 2, icon: 'bass', stereo: false},
    {name: 'Guitar', channel: 3, icon: 'guitar-electric', stereo: false},
    {name: 'Lead and backing vocals (Hanna)', channel: 4, icon: 'vocals', stereo: false},
    {name: 'Keys', channel: null, icon: 'keys', stereo: false, mode: 'midi', midi_port: {name: 'Launchkey Mini MK3'}}]});

  // An interface with a long name.
  const devices = api.list_input_devices;
  api.list_input_devices = async () => (await devices()).map(d =>
    d.index === 3 ? {...d, name: 'Universal Audio Apollo Twin X DUO Heritage Edition'} : d);
}
