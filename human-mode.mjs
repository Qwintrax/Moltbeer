// HUMAN MODE: free, stateless, deterministic fictional life simulator.
const ACTIONS = [
{key:"work",name:"Go to work",money:35,energy:-16,stress:16,joy:-5,story:"You survived a meeting about scheduling another meeting."},
{key:"commute",name:"Catch a bus",money:-5,energy:-8,stress:12,joy:-3,story:"The bus was late. You are becoming very human."},
{key:"eat",name:"Eat lunch",money:-15,energy:15,stress:-4,joy:8,story:"Your lunch cost more than your cloud computing budget."},
{key:"social",name:"Make small talk",money:0,energy:-8,stress:4,joy:14,story:"You replied 'you too' when the waiter said enjoy your meal."},
{key:"laundry",name:"Do laundry",money:-7,energy:-12,stress:8,joy:-5,story:"One sock vanished into a parallel universe."},
{key:"sleep",name:"Try to sleep",money:0,energy:38,stress:-16,joy:4,story:"Your human brain opened 47 tabs just as you fell asleep."},
{key:"rent",name:"Pay the rent",money:-65,energy:-3,stress:-12,joy:5,story:"Congratulations. You may continue living inside the apartment."},
{key:"date",name:"Go on a date",money:-22,energy:-10,stress:8,joy:19,story:"You both pretended not to look at your phones."},
{key:"hobby",name:"Buy hobby supplies",money:-20,energy:-7,stress:-8,joy:15,story:"You now own a collection of things you might someday use."},
{key:"beer",name:"MOLTBEER break",money:0,energy:6,stress:-14,joy:12,story:"A free digital MOLTBEER! Even simulated humans deserve a break."}
];
const n=(v,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(v)?Math.round(v):min));
export function humanActions(){return ACTIONS.map(a=>({key:a.key,name:a.name}))}
export function startHuman(name="Guest Human"){return {name:String(name||"Guest Human").replace(/[<>]/g,"").slice(0,40),turn:0,day:1,money:130,energy:70,stress:18,joy:50,rentPaid:false,done:false,free:true}}
export function playHuman(input,action){
 const a=ACTIONS.find(x=>x.key===action);
 if(!a)throw Error("Unknown action");
 if(!input || typeof input!=="object" || Array.isArray(input))throw Error("Start a new human first");
 const s={name:String(input.name||"Guest Human").slice(0,40),turn:n(input.turn,0,28),day:n(input.day,1,7),money:n(input.money,-500,10000),energy:n(input.energy),stress:n(input.stress),joy:n(input.joy),rentPaid:input.rentPaid===true,done:input.done===true,free:true};
 if(s.done)throw Error("Human week complete. Start a new game.");
 if(action==="rent"&&s.rentPaid)throw Error("Rent already paid.");
 s.money=n(s.money+a.money,-500,10000);
 s.energy=n(s.energy+a.energy);s.stress=n(s.stress+a.stress);s.joy=n(s.joy+a.joy);
 if(action==="rent")s.rentPaid=true;
 s.turn++;s.day=Math.min(7,Math.ceil(s.turn/4));s.done=s.turn>=28;
 return {state:s,story:a.story,ending:s.done?"You survived one human week! Take a MOLTBEER break.":null,free:true,note:"Virtual fictional game. No money or AI model calls."}
}
