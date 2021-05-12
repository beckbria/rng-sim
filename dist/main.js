(()=>{"use strict";function t(t){return Math.floor(Math.random()*Math.floor(t))}function e(){return"localhost"===location.hostname||"127.0.0.1"===location.hostname}var r=e();class i{constructor(t,e,r,i="",a=[]){this.name=t,this.prefix=e,this.rawInst=[""],this.inst=[],this.labels=new Map,this.currentLine=0,this.nextLine=1,this.editMode=!0,this.card="",this.reg=[0,0,0,0,0],this.inputQueue=[...a],this.initialInputQueue=[...a],this.keep=null,this.up=null,this.down=null,this.left=null,this.right=null,this.useLocalStorage=r,this.initialProgram=i,this.hasUi=!1,this.lastError="",this.showErrorCallback=function(t){console.log(t),alert(t)},this.waitingForRead=!1}static sourceCodeId="source_code";static cvalId="cval";static cvalbId="cvalb";static suitId="suit";static r0Id="r0";static r1Id="r1";static r2Id="r2";static r3Id="r3";static r4Id="r4";static inputQueueId="input_queue";static titleId="title";static registersId="regs";static registerMap=[{name:"CVAL",id:i.cvalId},{name:"CVALB",id:i.cvalbId},{name:"SUIT",id:i.suitId},{name:"R0",id:i.r0Id},{name:"R1",id:i.r1Id},{name:"R2",id:i.r2Id},{name:"R3",id:i.r3Id},{name:"R4",id:i.r4Id},{name:"INPUT",id:i.inputQueueId}];render(t){this.hasUi=!0;var e=document.getElementById(t),r=document.createElement("div");r.innerHTML=this.name,r.id=this.prefix+i.titleId,e.appendChild(r);var a=document.createElement("textarea");if(a.id=this.prefix+i.sourceCodeId,a.rows=10,a.cols=20,a.value=this.initialProgram,this.useLocalStorage)try{var s=localStorage.getItem(this.prefix);a.value=null!=s?localStorage.getItem(this.prefix):this.initialProgram}catch(t){a.value=this.initialProgram}e.appendChild(a);var n=document.createElement("table");n.id=this.prefix+i.registersId;for(const t of i.registerMap){var l=document.createElement("tr"),o=document.createElement("td");o.innerHTML=t.name,l.appendChild(o);var h=document.createElement("td"),d=document.createElement("input");d.readOnly=!0,d.size=4,d.id=this.prefix+t.id,h.appendChild(d),l.appendChild(h),"SUIT"==t.name&&(l.style.visibility="collapse"),n.appendChild(l)}n.style.visibility="collapse",e.appendChild(n)}reset(){this.currentLine=0,this.nextLine=1,this.card="",this.reg=[0,0,0,0,0],this.inputQueue=[...this.initialInputQueue],this.lastError="",this.advanceToNextNonLabel(),this.resetCursor(),this.updateRegisters()}setEditMode(t){if(t!=this.editMode)if(this.editMode=t,this.hasUi){var e=document.getElementById(this.prefix+i.sourceCodeId),r=document.getElementById(this.prefix+i.registersId);if(this.editMode)e.readOnly=!1,r.style.visibility="collapse",this.reset(),e.value=this.rawInst.join("\n"),i.scrollToLine(e,this.currentLine);else{if(e.readOnly=!0,r.style.visibility="visible",this.rawInst=e.value.split("\n"),!this.parseInstructions())return!1;if(this.useLocalStorage)try{localStorage.setItem(this.prefix,e.value)}catch(t){}i.addPadding(e,this.currentLine),this.updateRegisters()}}else if(this.editMode)this.reset();else{if(this.rawInst=this.initialProgram.split("\n"),!this.parseInstructions())return!1;this.updateRegisters()}return!0}program(){return this.hasUi?this.editMode?document.getElementById(this.prefix+i.sourceCodeId).value:this.rawInst.join("\n"):this.initialProgram}executeStage1(){const e=this.inst[this.currentLine];switch(this.waitingForRead=!1,e[0]){case"":case"LABEL":case"NOP":case"SEND":break;case"READ":case"RRAND":if(""!=this.card)return this.showError("Attempted to read a card while containing a card"),!1;if(0==this.inputQueue.length)return this.nextLine=this.currentLine,this.waitingForRead=!0,!0;var i=0;"RRAND"==e[0]&&(i=t(this.inputQueue.length)),this.card=this.inputQueue[i],r&&console.log("CH: "+this.name+" read card '"+this.card+"' from index "+i),this.inputQueue.splice(i,1);break;case"KEEP":if(null==this.keep)return this.showError("Attempted to keep but no keep output"),!1;if(""==this.card)return this.showError("Attempted to send a card when no card held"),!1;this.keep(this.card),r&&console.log("CH: "+this.name+" keeping '"+this.card),this.card="";break;case"ADD":case"SUB":const a=this.readValue(e[1]),s=this.readValue(e[2]),n="ADD"==e[0]?a+s:a-s;this.writeValue(e[3],n);break;case"NEG":const l=0-this.readValue(e[1]);this.writeValue(e[1],l);break;case"JMP":this.nextLine=this.labels[e[1]];break;case"JE":this.readValue(e[1])==this.readValue(e[2])&&(this.nextLine=this.labels[e[3]]);break;case"JNE":this.readValue(e[1])!=this.readValue(e[2])&&(this.nextLine=this.labels[e[3]]);break;case"JGT":this.readValue(e[1])>this.readValue(e[2])&&(this.nextLine=this.labels[e[3]]);break;case"JGE":this.readValue(e[1])>=this.readValue(e[2])&&(this.nextLine=this.labels[e[3]]);break;case"JLT":this.readValue(e[1])<this.readValue(e[2])&&(this.nextLine=this.labels[e[3]]);break;case"JLE":this.readValue(e[1])<=this.readValue(e[2])&&(this.nextLine=this.labels[e[3]]);break;default:this.showError("INTERNAL ERROR: Unknown command "+e)}return!0}executeStage2(){const t=this.inst[this.currentLine];if("SEND"==t[0]){if(""==this.card)return this.showError("Attempted to send a card when no card held"),!1;var e=null;switch(t[1]){case"LEFT":e=this.left;break;case"RIGHT":e=this.right;break;case"UP":e=this.up;break;case"DOWN":e=this.down;break;default:return this.showError("INTERNAL ERROR: invalid direction '"+t[1]+"'"),!1}if(null==e)return this.showError("No output attached to direction "+t[1]),!1;e(this.card),r&&console.log("CH: "+this.name+" sending '"+this.card+"' to direction "+t[1]),this.card=""}return!0}readValue(t){if(i.validReadableRegister(t))switch(t){case"R0":case"R1":case"R2":case"R3":case"R4":return this.reg[this.regNum(t)];case"CVAL":return this.cval();case"CVALB":return this.cvalb();case"SUIT":return this.suit();default:return this.showError("INTERNAL ERROR: readValue out of sync with validReadableRegister"),0}return parseInt(t,10)}writeValue(t,e){this.reg[this.regNum(t)]=e}regNum(t){switch(t){case"R0":case"R1":case"R2":case"R3":case"R4":return parseInt(t.substr(1,1),10);default:return this.showError("INTERNAL ERROR: Attempt to access invalid register '"+t+"'"),0}}advanceToNextLine(){return this.currentLine=this.nextLine,this.nextLine=this.currentLine+1,!!this.advanceToNextNonLabel()&&(this.resetCursor(),!0)}advanceToNextNonLabel(){for(;this.currentLine<this.inst.length&&["LABEL",""].includes(this.inst[this.currentLine][0]);)this.currentLine++,this.nextLine=this.currentLine+1;return!(this.currentLine>=this.inst.length&&(this.showError(this.name+": Execution continued past end of program",this.rawInst.length-1),1))}parseInstructions(){this.inst=[];for(var t=0;t<this.rawInst.length;t++){let e=this.parseInst(this.rawInst[t],t);if(!e.valid)return!1;this.inst.push(e.inst)}this.labels=new Map;for(var e=[],r=0;r<this.inst.length;r++)if(""!=this.inst[r][0])if("LABEL"==this.inst[r][0])e.push(this.inst[r][1]);else{for(const t of e){if(this.labels.has(t))return this.showError("Duplicate label: '"+t+"'",r),!1;this.labels[t]=r}e=[]}return e.length>0?(this.showError("Labels with no following instruction: "+e,this.rawInst.length-1),!1):this.advanceToNextNonLabel()}static validWritableRegister(t){return["R0","R1","R2","R3","R4"].includes(t)}static validReadableRegister(t){return i.validWritableRegister(t)||["SUIT","CVAL","CVALB"].includes(t)}static validReadableOrLiteral(t){return i.validReadableRegister(t)||i.isInteger(t)}static validOutputRegister(t){return["UP","LEFT","RIGHT","DOWN"].includes(t)}static isInteger(t){return NaN!=parseInt(t,10)}static validLabelName(t){return!["READ","RRAND","KEEP","SEND","ADD","SUB","NEG","JMP","JZ","JNZ","JGZ","NOP"].includes(t)&&t.match(/^[A-Z][A-Z0-9]+$/)}parseInst(t,e){let r=t.trim().toUpperCase().split(" ");const a="Too many arguments",s="Insufficient arguments";let n=r[0];switch(n.length>=1&&"#"==n.substr(0,1)&&(r=[""],n=""),n){case"":case"READ":case"RRAND":case"KEEP":case"NOP":if(1!=r.length)return this.showError(a,e),i.INVALID_INSTRUCTION;break;case"SEND":if(2!=r.length)return this.showError(1==r.length?s:a,e),i.INVALID_INSTRUCTION;if(!i.validOutputRegister(r[1]))return this.showError("Invalid destination '"+r[1]+"'",e),i.INVALID_INSTRUCTION;break;case"ADD":case"SUB":if(4!=r.length)return this.showError(r.length<4?s:a,e),i.INVALID_INSTRUCTION;for(var l=1;l<=2;l++)if(!i.validReadableOrLiteral(r[l]))return this.showError("Invalid value '"+r[l]+"'",e),i.INVALID_INSTRUCTION;if(!i.validWritableRegister(r[3]))return this.showError("Cannot write to register '"+r[3]+"'",e),i.INVALID_INSTRUCTION;break;case"NEG":if(2!=r.length)return this.showError(1==r.length?s:a,e),i.INVALID_INSTRUCTION;if(!i.validWritableRegister(r[1]))return this.showError("Cannot write to register '"+r[1]+"'",e),i.INVALID_INSTRUCTION;break;case"JMP":if(2!=r.length)return this.showError(1==r.length?s:a,e),i.INVALID_INSTRUCTION;if(!i.validLabelName(r[1]))return this.showError("Invalid label name '"+r[1]+"'",e),i.INVALID_INSTRUCTION;break;case"JE":case"JNE":case"JGT":case"JGE":case"JLT":case"JLE":if(4!=r.length)return this.showError(r.length<4?s:a,e),i.INVALID_INSTRUCTION;for(l=1;l<=2;l++)if(!i.validReadableOrLiteral(r[l]))return this.showError("Invalid value '"+r[l]+"'",e),i.INVALID_INSTRUCTION;if(!i.validLabelName(r[3]))return this.showError("Invalid label name '"+r[3]+"'",e),i.INVALID_INSTRUCTION;break;default:if(1!=r.length)return this.showError("Incorrect syntax",e),i.INVALID_INSTRUCTION;var o=r[0];return":"!=o.substr(o.length-1,1)?(this.showError("Incorrect syntax",e),i.INVALID_INSTRUCTION):(o=o.substr(0,o.length-1),i.validLabelName(o)?i.validInstruction(["LABEL",o]):(this.showError("Invalid label name '"+o+"'",e),i.INVALID_INSTRUCTION))}return i.validInstruction(r)}static INVALID_INSTRUCTION={valid:!1,tokens:[]};static validInstruction(t){return{valid:!0,inst:t}}showError(t,e=null){null==e&&(e=this.currentLine),this.lastError=this.name+": "+t+" at line "+e+" ("+this.rawInst[e]+")",this.showErrorCallback(this.lastError)}resetCursor(){if(this.hasUi){var t=document.getElementById(this.prefix+i.sourceCodeId);i.removePadding(t),i.addPadding(t,this.currentLine),i.scrollToLine(t,this.currentLine)}}resetToStockProgram(){this.hasUi&&(document.getElementById(this.prefix+i.sourceCodeId).value=this.initialProgram)}updateRegisters(){this.hasUi&&(document.getElementById(this.prefix+i.cvalId).value=this.cval(),document.getElementById(this.prefix+i.cvalbId).value=this.cvalb(),document.getElementById(this.prefix+i.suitId).value=this.suit(),document.getElementById(this.prefix+i.r0Id).value=this.reg[0],document.getElementById(this.prefix+i.r1Id).value=this.reg[1],document.getElementById(this.prefix+i.r2Id).value=this.reg[2],document.getElementById(this.prefix+i.r3Id).value=this.reg[3],document.getElementById(this.prefix+i.r4Id).value=this.reg[4],document.getElementById(this.prefix+i.inputQueueId).value=this.inputQueue.join(" "))}cval(){return i.cardValue(this.card)}cvalb(){return i.cardValueAdjusted(this.card)}static cardValue(t){if(2!=t.length)return 0;switch(t.substr(0,1)){case"A":return 1;case"2":return 2;case"3":return 3;case"4":return 4;case"5":return 5;case"6":return 6;case"7":return 7;case"8":return 8;case"9":return 9;case"T":return 10;case"J":return 11;case"Q":return 12;case"K":return 13}return alert(this.name+": Invalid card value: "+t.substr(0,1)),0}static cardValueAdjusted(t){var e=i.cardValue(t);return e>10?10:e}suit(){if(this.card.length<2)return 0;switch(this.card.substr(1,1)){case"S":return 1;case"H":return 2;case"D":return 3;case"C":return 4}return alert(this.name+": Invalid suit: "+this.card.substr(1,1)),0}appendCard(t){this.inputQueue.push(t)}static removePadding(t){t.value=i.linesWithDelimiter(t.value).reduce((function(t,e){return t+e.substring(2)}),"")}static addPadding(t,e){t.value=i.linesWithDelimiter(t.value).map((function(t,r){return r==e?">>"+t:"  "+t})).reduce((function(t,e){return t+e}),"")}static linesWithDelimiter(t){return t.split(/(?<=\n)/)}static scrollToLine(t,e){const r=t.value.split("\n").length,i=t.scrollHeight/r;t.scrollTop=e*i}}const a=["AS","2S","3S","4S","5S","6S","7S","8S","9S","TS","JS","QS","KS","AH","2H","3H","4H","5H","6H","7H","8H","9H","TH","JH","QH","KH","AD","2D","3D","4D","5D","6D","7D","8D","9D","TD","JD","QD","KD","AC","2C","3C","4C","5C","6C","7C","8C","9C","TC","JC","QC","KC"];a.sort();class s{constructor(e,r="",s="",n="",l=null){var o=l;null==o&&function(e){for(var r=e.length-1;r>0;r--){var i=t(r+1),a=e[r];e[r]=e[i],e[i]=a}}(o=[...a]),this.editMode=!0,this.dealerCards=[],this.playerCards=[],this.controlCh=new i("Control","control_",e,r,o),this.ch1=new i("CH1 (Dealer)","ch1_",e,s),this.ch2=new i("CH2 (Whale/Target Player)","ch2_",e,n),this.allCh=[this.ch2,this.ch1,this.controlCh],this.gameComplete=!1,this.bjState="",this.playerTotal=0,this.dealerTotal=0,this.programCounter=0;var h=this,d=function(t){h.ch1.appendCard(t)},c=function(t){h.ch2.appendCard(t)};this.controlCh.left=d,this.ch2.left=d,this.controlCh.right=c,this.ch1.right=c,this.ch1.keep=function(t){h.dealerCards.push(t),h.updateDealtCards()},this.ch2.keep=function(t){h.playerCards.push(t),h.updateDealtCards()}}runGame(){for(;!this.gameComplete&&this.nextLine(););}nextLine(){if(this.programCounter++,this.programCounter>1e4)return this.controlCh.showError("Infinite loop detected"),!1;var t=!0;for(var e of this.allCh)t&=e.executeStage1();for(var e of this.allCh)t&=e.executeStage2();for(var e of this.allCh)t&=e.advanceToNextLine();for(var e of this.allCh)e.updateRegisters();let r=!0;for(const t of this.allCh)r&=t.waitingForRead;return r?(this.controlCh.showError("Deadlock: All units waiting to read from empty queue"),!1):t}toggleEdit(){return this.setEditMode(!this.editMode)}setEditMode(t){let e=!0;if(t!=this.editMode)for(var r of(this.editMode=t,this.resetDealtCards(),this.allCh))e&=r.setEditMode(this.editMode);return e}static validDeck(t){if(!Array.isArray(t))return!1;const e=[...t];return e.sort(),e.length===a.length&&e.every(((t,e)=>t===a[e]))}setInitialDeck(t){return!!s.validDeck(t)&&(this.controlCh.initialInputQueue=t,this.controlCh.inputQueue=t,this.controlCh.updateRegisters(),!0)}resetState(){for(var t of this.allCh)t.reset();this.resetDealtCards(),this.programCounter=0}resetToStockProgram(){for(const t of this.allCh)t.resetToStockProgram()}resetDealtCards(){this.dealerCards=[],this.playerCards=[],this.updateDealtCards()}updateDealtCards(){this.updateBlackjackState()}chuState(){return{control:this.controlCh.program(),ch1:this.ch1.program(),ch2:this.ch2.program()}}gameState(){return{complete:this.gameComplete,dealerCards:this.dealerCards,playerCards:this.playerCards,bjState:this.bjState,dealerTotal:this.dealerTotal,playerTotal:this.playerTotal,controlError:this.controlCh.lastError,ch1Error:this.ch1.lastError,ch2Error:this.ch2.lastError,winner:s.winner(this.playerTotal,this.dealerTotal),deck:[...this.controlCh.initialInputQueue],programCounter:this.programCounter}}updateBlackjackState(){if(this.gameComplete=!1,0!=this.dealerCards.length){this.dealerTotal=i.cardValueAdjusted(this.dealerCards[0]),this.bjState="Dealer face-up: "+this.dealerCards[0]+"("+this.dealerTotal+")\n";var t=17;if(this.dealerTotal<7&&this.dealerTotal>1&&(t=12),this.bjState+="Player target: "+t+"\n",this.playerCards.length<2)this.bjState+="Waiting for initial player cards\n";else{var e=0,r=!1;this.playerTotal=0;for(let s=0;!r&&s<this.playerCards.length;s++){var a=this.playerCards[s],n=i.cardValueAdjusted(a);for(this.playerTotal+=n,1==n&&this.playerTotal<=11&&(this.playerTotal+=10,e++);e>0&&this.playerTotal>21;)this.playerTotal-=10,e--;this.bjState+="Player draws "+a+" for a total of "+this.playerTotal,e>0&&(this.bjState+=" (soft)"),this.bjState+="\n",this.playerTotal>=t&&(this.playerTotal>=18||0==e)&&(r=!0,this.bjState+=this.playerTotal>21?"Player busts\n":"Player stands\n")}if(r){r=!1,e=0;for(var l=1;!r&&l<this.dealerCards.length;l++){for(a=this.dealerCards[l],n=i.cardValueAdjusted(a),this.dealerTotal+=n,1==n&&this.dealerTotal<=11&&(this.dealerTotal+=10,e++);e>0&&this.dealerTotal>21;)this.dealerTotal-=10,e--;this.bjState+="Dealer draws "+a+" for a total of "+this.dealerTotal,e>0&&(this.bjState+=" (soft)"),this.bjState+="\n",this.dealerTotal>=17&&(r=!0,this.bjState+=this.dealerTotal>21?"Dealer busts\n":"Dealer stands\n")}if(r)switch(this.gameComplete=!0,s.winner(this.playerTotal,this.dealerTotal)){case-1:this.bjState+="Dealer wins\n";break;case 0:this.bjState+="Tie\n";break;case 1:this.bjState+="Player wins\n"}else this.bjState+="Waiting for more dealer cards\n"}else this.bjState+="Waiting for more player cards\n"}}else this.bjState="Waiting for first dealer card"}static winner(t,e){return t>21||t<e&&e<=21?-1:t==e?0:1}}var n=e();function l(t,e=null){let r=null==e?"":"\n\nExecution log:\n"+e.bjState+"\n\nInitial Deck:\n"+e.deck;return n&&null!=e&&(r+="\n\n"+JSON.stringify(e)),{success:!1,msg:t+r}}var o=new class extends s{constructor(){const t="LOOP:\nREAD\nKEEP\nJMP LOOP";super(!0,"LOOP:\nREAD\nSEND LEFT\nREAD\nSEND RIGHT\nJMP LOOP",t,t),this.controlCh.keep=function(t){alert("Control unit tried to keep card "+t)}}render(){this.controlCh.render("control_container"),this.ch1.render("ch1_container"),this.ch2.render("ch2_container"),this.attachOnClick()}attachOnClick(){var t=this;document.getElementById("edit_button").onclick=function(){t.toggleEdit()},document.getElementById("next_button").onclick=function(){t.nextLine()},document.getElementById("run_button").onclick=function(){t.runGame()},document.getElementById("reset_button").onclick=function(){t.resetState()}}resetState(){this.editMode||(document.getElementById("deck_button").disabled=!1,this.disableStepButtons(!1)),document.getElementById("validation_state_wrapper").style.visibility="collapse",super.resetState()}updateDealtCards(){document.getElementById("dealer_cards").value=this.dealerCards.join(", "),document.getElementById("player_cards").value=this.playerCards.join(", "),super.updateDealtCards()}nextLine(){document.getElementById("deck_button").disabled=!0;const t=super.nextLine();return t?this.gameComplete&&(document.getElementById("validate_button").disabled=!1,document.getElementById("next_button").disabled=!0,document.getElementById("run_button").disabled=!0):this.disableStepButtons(!0),t}disableStepButtons(t){const e=["next_button","run_button","deck_button"].map((function(t){return document.getElementById(t)}));for(const r of e)r.disabled=t}toggleEdit(){const t=super.toggleEdit(),e=document.getElementById("edit_button"),r=document.getElementById("reset_button"),i=document.getElementById("reset_stock_button");this.editMode?(e.innerHTML="To Run Mode",r.disabled=!0,i.disabled=!1,this.disableStepButtons(!0)):(e.innerHTML="To Edit Mode",r.disabled=!1,i.disabled=!0,this.disableStepButtons(!1)),t||(r.disabled=!0,this.disableStepButtons(!0)),document.getElementById("validate_button").disabled=!0}updateBlackjackState(){super.updateBlackjackState(),document.getElementById("blackjack_state").value=this.bjState}};function h(){document.getElementById("validation_state").value="";const t=function(t){const e=[];for(let r=0;r<30;r++){const r=new s(!1,t.control,t.ch1,t.ch2);r.toggleEdit(),r.runGame();const i=r.gameState();if(!i.complete){let t="System failed to complete.  Errors: \n";return i.controlError.length>0&&(t=t+"Control: "+i.controlError+"\n"),i.ch1Error.length>0&&(t=t+"CH1: "+i.ch1Error+"\n"),i.ch2Error.length>0&&(t=t+"CH2: "+i.ch2Error+"\n"),l(t,r)}e.push(i)}let r=!1,a=!1,o=!1,h=!1,d=null;const c=e[0];for(const t of e)h|=t.dealerTotal<=21,r|=i.cardValueAdjusted(t.dealerCards[0])!=i.cardValueAdjusted(c.dealerCards[0]),a|=t.dealerTotal!=c.dealerTotal,o|=t.playerTotal!=c.playerTotal,1!=t.winner&&(d=t);const u=n?c:null;return r?a?o?null!=d?l("Validation passed, but the player did not always win.  Example of loss:\n\n",d):{success:!0,msg:atob("R0lCU09O")}:l("The player's total was always "+c.playerTotal,u):l("The dealer's total was always "+c.dealerTotal,u):l("The dealer's shown card always had a value of "+i.cardValueAdjusted(c.dealerCards[0]),u)}(o.chuState());t.success&&alert("Congratulations! "+t.msg),document.getElementById("validation_state").value=t.msg,document.getElementById("validation_state_wrapper").style.visibility="visible"}function d(){const t=prompt("Please provide the initial deck order (such as 'AC,2S,TD...' or 'AC 2S TD...'").trim(),e=t.split(","),r=t.split(" ");let i=!1;52==e.length?i=o.setInitialDeck(e):52==r.length&&(i=o.setInitialDeck(r)),i||alert("Invalid deck provided - please include exactly one of each card")}function c(){confirm("This will overwrite all CH programs.  Continue?")&&o.resetToStockProgram()}window.onload=function(){document.getElementById("validate_button").onclick=h,document.getElementById("deck_button").onclick=d,document.getElementById("reset_stock_button").onclick=c,o.render()}})();