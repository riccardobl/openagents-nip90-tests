async function onLoad(){
    const _el=(id,type)=>{
        let el=document.querySelector(type+"#"+id);
        if(!el){
            el=document.createElement(type);
            el.id=id;
            document.body.appendChild(el);
        }
        return el;
    }
    _el("warning","div").innerHTML=`
        <h1>Warning</h1>
        This is a demo page, event encryption is currently not implemented.
        <br>
        Every data you submit here is posted on a public Nostr relay and can be read by anyone!  
    `;
    
    _el("titleEvent","h1").innerText="Event";
    const eventTextAreaEl=_el("eventTextArea","textarea");

    const submitBtn=_el("submitBtn","button");
    submitBtn.innerText="Submit";

    _el("titleOutput","h1").innerText="Output";
    const outputEl=_el("output","div");

    _el("titleLog","h1").innerText="Log";
    const logEl=_el("log","div");



    const pool = new window.NostrTools.SimplePool();
    let relays = window.nostrRelays;


    window.inputEvent=(ev)=>{
        if(typeof ev!="string"){
            ev=JSON.stringify(ev,null,2);
        }
        eventTextAreaEl.value=ev;
    };
    
    const userPrivateKey = window.NostrTools.generateSecretKey();

    pool.subscribeMany(relays, [
        {
            kinds: [7000]
        }
    ], {
        onevent: async (event) => {
            if (event.kind == 7000) {
                const etag = event.tags.find(t => t[0] == "e");
                if (etag[1] != window.jobId) {
                    return;
                }

                const status = event.tags.find(t => t[0] == "status");
                if (status && status[1] == "log") {
                    const logEntryEl = document.createElement('span');
                    logEntryEl.innerText = status[2];
                    logEl.appendChild(logEntryEl);
                } else if (status && status[1] == "error") {
                    const errorEntryEl = document.createElement('span');
                    errorEntryEl.classList.add('error');
                    errorEntryEl.innerText = status[2]||event.content;
                    logEl.appendChild(errorEntryEl);
                } else if (status && status[1] == "success") {
                    const filter = {
                        kinds: [6003],
                        "#e": [window.jobId],
                        limit: 1
                    };
                    console.log("\n\nRemote done. Find results using filter: " + JSON.stringify(filter, null, 2));
                    const result = await pool.querySync(relays, filter);
                    const content = result[0].content;
                    outputEl.innerText = content;
                    if(window.onJobResult){
                        window.onJobResult(content);
                    }
                }
            }
        }
    });

    submitBtn.addEventListener("click", () => {
        try {
            let event = JSON.parse(eventTextAreaEl.value);
            event = window.NostrTools.finalizeEvent(event, userPrivateKey);
            window.jobId = event.id;
            console.log("Send event",event);
            pool.publish(relays, event);
            const logEntryEl = document.createElement('span');
            logEntryEl.innerText = "Event submitted... waiting ...";
            logEl.appendChild(logEntryEl);
        } catch (e) {
            console.error(e);
            alert("Error! " + e.message);
        }
    });
}


window.addEventListener('load', onLoad);