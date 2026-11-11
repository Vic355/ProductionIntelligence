namespace ProductionIntelligence.Web.Data;

/// <summary>Visual tone for state pills and bars.</summary>
public enum Tone { Good, Warn, Crit, Idle, Info }

public static class ToneExtensions
{
    public static string Css(this Tone t) => t switch
    {
        Tone.Good => "good",
        Tone.Warn => "warn",
        Tone.Crit => "crit",
        Tone.Info => "info",
        _ => "idle",
    };
}

public record PaceSnapshot(
    string Line, string Product, string Shift, string Clock, string Crew,
    int Target, int Made, int ExpectedByNow, int MinutesLeft, double RateNow, string Unit)
{
    public int Remaining => Target - Made;
    public double RateNeeded => Math.Round((double)Remaining / MinutesLeft, 1);
    public int ProjectedShortfall => (int)Math.Round(Remaining - RateNow * MinutesLeft, 0);
    public int PercentMade => (int)Math.Round(100.0 * Made / Target);
    public int PercentExpected => (int)Math.Round(100.0 * ExpectedByNow / Target);
    public bool Behind => RateNow < RateNeeded;
    public string TimeLeft => $"{MinutesLeft / 60} h {MinutesLeft % 60} min";
}

public record Fix(int Rank, string Title, string Steps, int Worked, int Tried, string Source);

public record LineStatus(
    string Id, string Name, string Product, string State, Tone Tone,
    string Pace, int PacePercent, string Rate, string Detail, string Crew, string? EscalateTo);

public record FixProposal(string Id, string Meta, string Title, string Body, string Source);

public record RepeatLoss(
    string Issue, string Line, int MinutesThisWeek, int[] WeeklyMinutes,
    string Countermeasure, string Owner, string Status, Tone Tone, string Note);

public record SkillRow(string Problem, string[] Levels);

public record QaPair(string Question, string[] Answer, string Sources);

/// <summary>
/// Realistic sample data for a tissue converting hall (bought-in jumbo rolls, six lines, three shifts).
/// In the real system this comes from the PLC project (counts, speeds, stops), the Voice project
/// (reason codes, transcripts, "what fixed it"), the planner's daily target and the shift roster.
/// </summary>
public static class SampleData
{
    public static readonly PaceSnapshot Line3Pace = new(
        Line: "Line 3",
        Product: "Toilet roll 2-ply, 200 sheets · 9-pack",
        Shift: "Shift A · 06:00–14:00",
        Clock: "11:40",
        Crew: "Chidi O. · Ana P.",
        Target: 4800, Made: 3310, ExpectedByNow: 3400, MinutesLeft: 140, RateNow: 9.8, Unit: "packs / min");

    public static readonly Fix[] WebBreakFixes =
    {
        new(1, "Ease unwind brake 5% and rethread",
            "Check the splice on the jumbo, lower unwind brake one step, rethread through the embosser at crawl speed.",
            14, 17, "SOP RW-012 §4 · case #2231 (Shift C)"),
        new(2, "Clean edge build-up on embosser roll",
            "Lock out first. Scrape the dust ridge at drive side with the plastic scraper, wipe, check deckle.",
            9, 12, "Case #2187 (Shift B) · approved by M. Okafor"),
        new(3, "Check the jumbo for wet streaks or core damage",
            "If found, tag the roll for QA, swap to the next jumbo and log the roll number.",
            5, 8, "Converting manual ch. 7"),
    };

    public static readonly LineStatus[] Lines =
    {
        new("L1", "Line 1", "Toilet roll 3-ply · 4-pack", "Running", Tone.Good, "104%", 100, "need 18.2, now 19.0 packs/min", "2 stops · 9 min", "Kofi A., Grace N.", null),
        new("L2", "Line 2", "Kitchen towel 2-ply · 2-roll", "Running", Tone.Good, "97%", 97, "need 14.1, now 13.8 packs/min", "3 stops · 31 min · ticket M-3381 open", "Ben T., Sara K.", null),
        new("L3", "Line 3", "Toilet roll 2-ply · 9-pack", "Stopped 6 min", Tone.Crit, "92%", 92, "need 10.9 packs/min", "Web break at embosser · 3rd this shift", "Chidi O., Ana P.", "maintenance"),
        new("L4", "Line 4", "Facial tissue · 100-sheet box", "Behind pace", Tone.Warn, "88%", 88, "need 52, now 47 boxes/min", "6 stops · 38 min · log saw jam ×4", "Dewi S., Tom R.", "section head"),
        new("L5", "Line 5", "Napkin 33 cm · 1-ply to 2-ply", "Changeover", Tone.Idle, "100%", 100, "planned 25 min, ends 11:55", "On plan", "Lena M.", null),
        new("L6", "Line 6", "Away-from-home jumbo roll · 12-pack", "Running", Tone.Good, "101%", 100, "need 3.4, now 3.5 packs/min", "1 stop · 6 min", "Musa I., Pia L.", null),
    };

    public static readonly (string Line, string People)[] Roster =
    {
        ("Line 1", "Kofi A., Grace N."),
        ("Line 2", "Ben T., Sara K."),
        ("Line 3", "Chidi O. (3 weeks), Ana P."),
        ("Line 4", "Dewi S., Tom R. (cover from L6)"),
        ("Line 5", "Lena M."),
        ("Line 6", "Musa I., Pia L."),
    };

    public static readonly FixProposal[] Proposals =
    {
        new("a", "Line 4 · Dewi S. · voice log 09:12 · same fix in 3 stops",
            "Tighten log saw blade clamp to 4 Nm after every blade change",
            "Since the new blades arrived the clamp backs off and the log saw jams. Three restarts this week stuck after re-torquing.",
            "3 voice transcripts · log saw manual LS-4 p. 22"),
        new("b", "Line 6 · Musa I. · “what fixed it?” answer · 2 cases",
            "Swap glue nozzle tip when tail seal looks dry",
            "Open tails on the jumbo rolls stopped after the nozzle tip was replaced, both times inside 5 minutes.",
            "Cases #2240, #2244 · tail sealer SOP TS-03"),
    };

    public static readonly RepeatLoss[] RepeatLosses =
    {
        new("Web break at embosser", "Line 3", 126, new[] { 44, 52, 38, 60, 71, 126 },
            "Hold jumbo batch 4471–79 for moisture check", "Shift A lead · due 13 Nov", "Verifying", Tone.Info, "4 of 10 production days of data so far"),
        new("Log saw blade jam", "Line 4", 74, new[] { 30, 28, 35, 33, 41, 74 },
            "Clamp torque 4 Nm after blade change", "Process engineer · since 6 Nov", "Not working yet", Tone.Crit, "Jams per blade change unchanged (0.9 → 0.9)"),
        new("Wrapper film jam", "Line 2", 52, new[] { 40, 47, 55, 49, 58, 52 },
            "Replace film dancer arm bearing", "Maintenance · due 15 Nov", "Not started", Tone.Idle, "Ticket M-3381 waiting for part"),
        new("Core jam at loader", "Line 1", 38, new[] { 98, 102, 77, 51, 44, 38 },
            "New glue nozzle and 4-hour cleaning interval", "Maintenance, R. Osei · done 19 Oct", "Worked", Tone.Good, "Stops down 62% over 3 weeks"),
        new("Open tails on log", "Line 6", 31, new[] { 70, 88, 95, 62, 40, 31 },
            "Nozzle tip swap shared from Shift C", "Shift C lead · done 27 Oct", "Worked", Tone.Good, "Stops down 70% over 2 weeks"),
    };

    public static readonly (string Shift, double PercentOfPlan)[] ShiftOutput =
        { ("Shift A", 95.1), ("Shift B", 98.2), ("Shift C", 95.9) };

    public static readonly (string Line, double Hours)[] LineDowntime =
        { ("Line 1", 4.2), ("Line 2", 7.9), ("Line 3", 11.6), ("Line 4", 9.8), ("Line 5", 5.1), ("Line 6", 2.9) };

    /// <summary>S = handles well, L = learning, F = few cases. Columns: Shift A, B, C.</summary>
    public static readonly SkillRow[] Skills =
    {
        new("Web break at embosser", new[] { "L", "S", "S" }),
        new("Log saw jam", new[] { "S", "L", "F" }),
        new("Core jam at loader", new[] { "S", "S", "L" }),
        new("Wrapper film jam", new[] { "L", "S", "S" }),
        new("Tail seal / open tails", new[] { "F", "L", "S" }),
    };

    public static readonly QaPair[] Questions =
    {
        new("Why was Line 3 down so much this week?", new[]
        {
            "Line 3 lost 11.6 hours, the most in the section. Web breaks at the embosser took 126 minutes over 14 stops, up from 6 stops in week 44.",
            "9 of those 14 breaks were on jumbo rolls from supplier batch 4471–4479, and 4 voice logs mention a wet streak. Breaks on other jumbos ran at the normal rate.",
            "The other big losses were 2 planned changeovers (3.1 h) and a core jam cluster on Thursday night (52 min). Shift A has handled fewer embosser breaks than B and C, so restarts took longer: median 9 min against 5.",
        }, "PLC stop log L3 · 31 voice transcripts · jumbo roll IDs from unwind scans · roster"),
        new("Did the Line 4 clamp torque fix work?", new[]
        {
            "Not yet. Since 6 Nov the log saw has jammed 0.9 times per blade change, the same as before the countermeasure.",
            "Jams cluster in the first 40 minutes after a blade change with the new supplier’s blades. Blades from the old supplier, used on 2 changes, had no jams.",
            "Worth checking the blade spec with purchasing before more torque changes.",
        }, "PLC stop log L4 · blade change records · action #A-21"),
        new("Which handover notes flagged problems that came back?", new[]
        {
            "Three this week. Shift B flagged the Line 2 wrapper on Tuesday; it stopped again 4 times on Wednesday.",
            "Shift A flagged Line 3 jumbo batch 4471 on Thursday; breaks continued into Friday.",
            "Shift C flagged Line 4 blades on Monday night, the earliest warning of the log saw issue.",
        }, "Handover notes (21) · PLC stop log"),
    };
}
