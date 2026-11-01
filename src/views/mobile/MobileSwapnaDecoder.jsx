import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { MoonIcon, MagnifyingGlassIcon, InboxIcon, ClipboardDocumentListIcon, SparklesIcon, MicrophoneIcon } from '@heroicons/vue/24/outline';
import swapnaDecoderService from '../../services/swapnaDecoderService';
import dreamRequestService from '../../services/dreamRequestService';
import { useToast } from 'vue-toastification';

export default {
  name: 'MobileSwapnaDecoder',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const loading = ref(false);
    const dreamList = ref([]);
    const filteredDreams = ref([]);
    const searchQuery = ref('');
    const selectedCategory = ref('');
    const selectedDream = ref(null);
    const showDetailModal = ref(false);
    const showRequestModal = ref(false);
    const activeTab = ref('ask');
    const myRequests = ref([]);

    // ── Ask Your Dream (AI) ─────────────────────────────────────────────────────
    const MAX_DREAM_LENGTH = 1500;      // keep in sync with backend swapnaInterpretService
    const MAX_QUESTION_LENGTH = 300;
    const MAX_FOLLOWUP_TURNS = 6;
    const dreamText = ref('');
    const interpretLanguage = ref('hi');
    const decoding = ref(false);
    const askingFollowUp = ref(false);
    const interpretError = ref('');
    const interpretation = ref(null);   // first interpretation result
    const suggestedFollowUps = ref([]); // chips for the next question
    const followUps = ref([]);          // answered [{ question, answer }]
    const followUpInput = ref('');
    const listeningTarget = ref(null);  // 'dream' | 'followup' | null

    const SpeechRecognitionApi = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
    const speechSupported = !!SpeechRecognitionApi;
    let recognition = null;

    const stopVoice = () => {
      if (recognition) {
        try { recognition.stop(); } catch (_) {}
        recognition = null;
      }
      listeningTarget.value = null;
    };

    const toggleVoice = (target) => {
      if (listeningTarget.value === target) {
        stopVoice();
        return;
      }
      stopVoice();
      recognition = new SpeechRecognitionApi();
      recognition.lang = interpretLanguage.value === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.continuous = target === 'dream';
      const base = target === 'dream' ? dreamText.value : followUpInput.value;
      recognition.onresult = (event) => {
        const spoken = Array.from(event.results).map(r => r[0].transcript).join(' ').trim();
        const joined = [base.trim(), spoken].filter(Boolean).join(' ');
        if (target === 'dream') dreamText.value = joined.slice(0, MAX_DREAM_LENGTH);
        else followUpInput.value = joined.slice(0, MAX_QUESTION_LENGTH);
      };
      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          toast.error('Microphone permission is needed for voice input.');
        }
        listeningTarget.value = null;
      };
      recognition.onend = () => { listeningTarget.value = null; };
      try {
        recognition.start();
        listeningTarget.value = target;
      } catch (_) {
        recognition = null;
      }
    };

    const requestInterpretation = async (payload) => {
      const token = localStorage.getItem('token_user');
      if (!token) throw new Error('Please login again to decode your dream.');
      const res = await swapnaDecoderService.interpret(payload, token);
      return res.data;
    };

    const decodeDream = async () => {
      if (decoding.value) return;
      stopVoice();
      const dream = dreamText.value.trim();
      if (dream.length < 10) {
        interpretError.value = 'Please describe your dream in a little more detail.';
        return;
      }
      interpretError.value = '';
      decoding.value = true;
      askingFollowUp.value = false;
      try {
        const data = await requestInterpretation({ dream, language: interpretLanguage.value });
        interpretation.value = data;
        suggestedFollowUps.value = data.followUps || [];
        followUps.value = [];
        followUpInput.value = '';
      } catch (error) {
        interpretError.value = error.message || 'Could not decode your dream right now. Please try again.';
      } finally {
        decoding.value = false;
      }
    };

    const askFollowUp = async (presetQuestion) => {
      if (decoding.value || !interpretation.value) return;
      stopVoice();
      const question = String(presetQuestion ?? followUpInput.value).trim();
      if (!question) return;
      interpretError.value = '';
      decoding.value = true;
      askingFollowUp.value = true;
      try {
        const data = await requestInterpretation({
          dream: dreamText.value.trim(),
          language: interpretLanguage.value,
          question,
          history: followUps.value
        });
        followUps.value = [...followUps.value, { question, answer: data.answer || data.summary }];
        suggestedFollowUps.value = data.followUps || [];
        followUpInput.value = '';
      } catch (error) {
        interpretError.value = error.message || 'Could not answer right now. Please try again.';
      } finally {
        decoding.value = false;
        askingFollowUp.value = false;
      }
    };

    const openMatchedSymbol = async (id) => {
      const known = dreamList.value.find(d => d._id === id);
      if (known) { viewDream(known); return; }
      try {
        viewDream(await swapnaDecoderService.getById(id));
      } catch (_) {
        toast.error('Could not open this dream.');
      }
    };

    onBeforeUnmount(stopVoice);
    const requestForm = ref({
      dreamSymbol: '',
      additionalDetails: ''
    });

    const categories = ['All', 'Animals', 'Nature', 'People', 'Objects', 'Actions', 'Places', 'Colors', 'Numbers', 'Emotions', 'Events'];

    const fetchDreams = async () => {
      loading.value = true;
      try {
        const clientId = localStorage.getItem('user_client_id');
        const data = await swapnaDecoderService.getAll({ clientId, status: 'Active' });
        dreamList.value = data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        filteredDreams.value = dreamList.value;
      } catch (error) {
        console.error('Error loading dreams:', error);
      } finally {
        loading.value = false;
      }
    };

    const fetchMyRequests = async () => {
      loading.value = true;
      try {
        const clientId = localStorage.getItem('user_client_id');
        const token = localStorage.getItem('token_user');
        
        // Extract userId from token
        let userId = null;
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId;
          } catch (e) {
            console.error('Error parsing token:', e);
            return;
          }
        }
        
        if (!userId) {
          return;
        }
        
        const data = await dreamRequestService.getAll({ userId, clientId });
        myRequests.value = data;
      } catch (error) {
        console.error('Error loading requests:', error);
      } finally {
        loading.value = false;
      }
    };

    const filterDreams = () => {
      let filtered = dreamList.value;

      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(d => 
          d.symbolName.toLowerCase().includes(query) ||
          d.symbolNameHindi?.toLowerCase().includes(query) ||
          d.shortDescription?.toLowerCase().includes(query)
        );
      }

      if (selectedCategory.value && selectedCategory.value !== 'All') {
        filtered = filtered.filter(d => d.category === selectedCategory.value);
      }

      filteredDreams.value = filtered;
    };

    const viewDream = (dream) => {
      selectedDream.value = dream;
      showDetailModal.value = true;
    };

    const closeModal = () => {
      showDetailModal.value = false;
      selectedDream.value = null;
    };

    const openRequestModal = () => {
      requestForm.value.dreamSymbol = searchQuery.value;
      showRequestModal.value = true;
    };

    const closeRequestModal = () => {
      showRequestModal.value = false;
      requestForm.value = {
        dreamSymbol: '',
        additionalDetails: ''
      };
    };

    const submitRequest = async () => {
      if (!requestForm.value.dreamSymbol.trim()) {
        toast.error('Please enter dream symbol');
        return;
      }

      loading.value = true;
      try {
        const token = localStorage.getItem('token_user');
        
        let userId = null;
        // Use stored CLI-XXXXXX clientId
        const clientId = localStorage.getItem('user_client_id');

        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId;
          } catch (e) {
            console.error('Error parsing token:', e);
            toast.error('Session expired. Please login again.');
            loading.value = false;
            return;
          }
        }
        
        if (!userId) {
          toast.error('User not authenticated. Please login again.');
          loading.value = false;
          return;
        }
        
        await dreamRequestService.create({
          dreamSymbol: requestForm.value.dreamSymbol,
          additionalDetails: requestForm.value.additionalDetails,
          // Send clientId only if it's a valid CLI-XXXXXX, otherwise backend resolves it
          ...(clientId && clientId !== 'null' && /^CLI-/i.test(clientId) ? { clientId } : {}),
        });
        toast.success('Dream request submitted successfully! We will notify you when it\'s ready.');
        closeRequestModal();
        await fetchMyRequests();
      } catch (error) {
        console.error('Error submitting request:', error);
        toast.error('Failed to submit request');
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchDreams();
      // Don't fetch requests on mount - only when user opens requests tab
    });

    return () => (
      <div style="min-height: 100vh; background: linear-gradient(135deg, #f5f1eb 0%, #ede7d9 100%); padding: 1rem;">
        <style>{`
          .search-input {
            width: 100%;
            padding: 0.75rem 1rem 0.75rem 2.5rem;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 1rem;
            background: white;
            transition: all 0.3s ease;
          }
          .search-input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }
          .ask-textarea {
            width: 100%;
            padding: 0.75rem 1rem;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 1rem;
            resize: vertical;
            box-sizing: border-box;
          }
          .ask-textarea:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
          }
          .badge-tradition, .badge-reflection {
            display: inline-block;
            padding: 0.25rem 0.65rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 700;
          }
          .badge-tradition { background: #fef3c7; color: #92400e; }
          .badge-reflection { background: #ede9fe; color: #5b21b6; }
          .category-chip {
            padding: 0.5rem 1rem;
            border-radius: 20px;
            border: 2px solid #e5e7eb;
            background: white;
            cursor: pointer;
            transition: all 0.3s ease;
            white-space: nowrap;
            font-size: 0.875rem;
            font-weight: 500;
          }
          .category-chip.active {
            background: #6366f1;
            color: white;
            border-color: #6366f1;
          }
          .dream-card {
            background: white;
            border-radius: 16px;
            padding: 1rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: all 0.3s ease;
          }
          .dream-card:active {
            transform: scale(0.98);
          }
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
          }
          .modal-content {
            background: white;
            border-radius: 20px;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 1.5rem;
          }
        `}</style>

        {/* Header */}
        <div style="margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
            <MoonIcon style="width: 2rem; height: 2rem; color: #6366f1;" />
            <h1 style="margin: 0; font-size: 1.75rem; font-weight: 800; color: #2d3748;">Swapna Decoder</h1>
          </div>
          <p style="margin: 0; color: #6b7280; font-size: 0.95rem;">Decode your dreams with Vedic wisdom</p>
        </div>

        {/* Tabs */}
        <div style="display: flex; gap: 0.35rem; margin-bottom: 1.5rem; background: white; border-radius: 16px; padding: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          {[
            { key: 'ask', label: 'Ask Your Dream', icon: SparklesIcon },
            { key: 'dreams', label: 'Popular Dreams', icon: MoonIcon },
            { key: 'requests', label: 'My Requests', icon: ClipboardDocumentListIcon }
          ].map(tab => {
            const active = activeTab.value === tab.key;
            const completedCount = tab.key === 'requests' ? myRequests.value.filter(r => r.status === 'Completed').length : 0;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  activeTab.value = tab.key;
                  if (tab.key === 'requests' && myRequests.value.length === 0) fetchMyRequests();
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem 0.25rem',
                  background: active ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'transparent',
                  border: 'none',
                  borderRadius: '12px',
                  color: active ? 'white' : '#6b7280',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  position: 'relative',
                  boxShadow: active ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                }}
              >
                <tab.icon style={{ width: '1.25rem', height: '1.25rem' }} />
                {tab.label}
                {completedCount > 0 && (
                  <span style="position: absolute; top: 0.25rem; right: 0.25rem; background: #10b981; color: white; border-radius: 10px; padding: 0.125rem 0.5rem; font-size: 0.7rem; font-weight: 700;">
                    {completedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Ask Your Dream */}
        {activeTab.value === 'ask' && (
          <div style="display: grid; gap: 1rem; margin-bottom: 1.5rem;">
            <div style="background: white; border-radius: 16px; padding: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <label style="font-weight: 700; color: #374151;">Describe your dream</label>
                <div style="display: flex; gap: 0.25rem;">
                  {[['hi', 'हिं'], ['en', 'EN']].map(([code, label]) => (
                    <button
                      key={code}
                      onClick={() => { interpretLanguage.value = code; }}
                      style={`padding: 0.2rem 0.6rem; border-radius: 8px; border: 1px solid ${interpretLanguage.value === code ? '#6366f1' : '#e5e7eb'}; background: ${interpretLanguage.value === code ? '#e0e7ff' : 'white'}; color: #4338ca; font-size: 0.75rem; font-weight: 600; cursor: pointer;`}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <textarea
                class="ask-textarea"
                rows="5"
                maxlength={MAX_DREAM_LENGTH}
                value={dreamText.value}
                onInput={(e) => { dreamText.value = e.target.value; }}
                placeholder="e.g. I saw a white elephant walking near a temple at dawn..."
              ></textarea>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <span style="font-size: 0.75rem; color: #9ca3af;">{dreamText.value.length}/{MAX_DREAM_LENGTH}</span>
                <div style="display: flex; gap: 0.5rem;">
                  {speechSupported && (
                    <button
                      onClick={() => toggleVoice('dream')}
                      aria-label={listeningTarget.value === 'dream' ? 'Stop voice input' : 'Speak your dream'}
                      style={`display: flex; align-items: center; gap: 0.35rem; padding: 0.6rem 0.9rem; border-radius: 12px; border: 2px solid ${listeningTarget.value === 'dream' ? '#ef4444' : '#e5e7eb'}; background: ${listeningTarget.value === 'dream' ? '#fee2e2' : 'white'}; color: ${listeningTarget.value === 'dream' ? '#b91c1c' : '#374151'}; font-weight: 600; cursor: pointer;`}
                    >
                      <MicrophoneIcon style="width: 1.1rem; height: 1.1rem;" />
                      {listeningTarget.value === 'dream' ? 'Listening…' : 'Speak'}
                    </button>
                  )}
                  <button
                    onClick={decodeDream}
                    disabled={decoding.value}
                    style={`padding: 0.6rem 1.4rem; border-radius: 12px; border: none; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; font-weight: 700; cursor: ${decoding.value ? 'wait' : 'pointer'}; opacity: ${decoding.value ? 0.7 : 1};`}
                  >
                    {decoding.value && !askingFollowUp.value ? 'Decoding…' : '✨ Decode'}
                  </button>
                </div>
              </div>
              {interpretError.value && (
                <p style="margin: 0.75rem 0 0 0; color: #b91c1c; font-size: 0.875rem;">{interpretError.value}</p>
              )}
            </div>

            {interpretation.value && (
              <div style="background: white; border-radius: 16px; padding: 1.25rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                {interpretation.value.notADream ? (
                  <p style="margin: 0; color: #374151; line-height: 1.6;">{interpretation.value.summary || 'Please describe a dream you saw, and I will decode it.'}</p>
                ) : (
                  <>
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.2rem; font-weight: 800; color: #1f2937;">{interpretation.value.title}</h3>
                    <p style="margin: 0 0 1rem 0; color: #374151; line-height: 1.6;">{interpretation.value.summary}</p>

                    {interpretation.value.tradition.length > 0 && (
                      <div style="margin-bottom: 1rem;">
                        <span class="badge-tradition">📜 From Tradition</span>
                        {interpretation.value.tradition.map((t, idx) => (
                          <div key={idx} style="background: #fffbeb; border-left: 3px solid #f59e0b; padding: 0.75rem; border-radius: 8px; margin-top: 0.5rem;">
                            <p style="margin: 0 0 0.25rem 0; font-weight: 700; color: #92400e;">{t.symbol}</p>
                            <p style="margin: 0; color: #78350f; font-size: 0.9rem; line-height: 1.5;">{t.meaning}</p>
                            {t.source && <p style="margin: 0.35rem 0 0 0; color: #a16207; font-size: 0.75rem;">Source: {t.source}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {interpretation.value.matchedSymbols.length > 0 && (
                      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
                        {interpretation.value.matchedSymbols.map(sym => (
                          <button key={sym._id} onClick={() => openMatchedSymbol(sym._id)} style="padding: 0.3rem 0.7rem; border-radius: 999px; border: 1px solid #c7d2fe; background: #eef2ff; color: #4338ca; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
                            Read full meaning: {sym.symbolName}
                          </button>
                        ))}
                      </div>
                    )}

                    {interpretation.value.reflection.length > 0 && (
                      <div style="margin-bottom: 1rem;">
                        <span class="badge-reflection">💭 Personal Reflection (speculative)</span>
                        <ul style="margin: 0.5rem 0 0 0; padding-left: 1.25rem; color: #4b5563; line-height: 1.6;">
                          {interpretation.value.reflection.map((r, idx) => <li key={idx}>{r}</li>)}
                        </ul>
                      </div>
                    )}

                    {followUps.value.length > 0 && (
                      <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                        {followUps.value.map((f, idx) => (
                          <div key={idx} style="margin-bottom: 0.75rem;">
                            <p style="margin: 0 0 0.25rem 0; font-weight: 700; color: #4338ca; font-size: 0.9rem;">Q: {f.question}</p>
                            <p style="margin: 0; color: #374151; line-height: 1.6;">{f.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {suggestedFollowUps.value.length > 0 && followUps.value.length < MAX_FOLLOWUP_TURNS && (
                      <div style="margin-top: 1rem;">
                        <p style="margin: 0 0 0.5rem 0; font-size: 0.8rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">Ask a follow-up</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
                          {suggestedFollowUps.value.map((q, idx) => (
                            <button key={idx} disabled={decoding.value} onClick={() => askFollowUp(q)} style="padding: 0.4rem 0.8rem; border-radius: 999px; border: 1px solid #e5e7eb; background: #f9fafb; color: #374151; font-size: 0.8rem; cursor: pointer; text-align: left;">
                              {q}
                            </button>
                          ))}
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                          <input
                            type="text"
                            class="search-input"
                            style="padding-left: 1rem;"
                            maxlength={MAX_QUESTION_LENGTH}
                            placeholder="Type your own question..."
                            value={followUpInput.value}
                            onInput={(e) => { followUpInput.value = e.target.value; }}
                            onKeydown={(e) => { if (e.key === 'Enter') askFollowUp(); }}
                          />
                          {speechSupported && (
                            <button onClick={() => toggleVoice('followup')} aria-label="Speak your question" style={`padding: 0 0.8rem; border-radius: 12px; border: 2px solid ${listeningTarget.value === 'followup' ? '#ef4444' : '#e5e7eb'}; background: ${listeningTarget.value === 'followup' ? '#fee2e2' : 'white'}; cursor: pointer;`}>
                              <MicrophoneIcon style="width: 1.1rem; height: 1.1rem; color: #374151;" />
                            </button>
                          )}
                          <button onClick={() => askFollowUp()} disabled={decoding.value} style="padding: 0 1rem; border-radius: 12px; border: none; background: #6366f1; color: white; font-weight: 700; cursor: pointer;">Ask</button>
                        </div>
                        {decoding.value && askingFollowUp.value && <p style="margin: 0.5rem 0 0 0; font-size: 0.8rem; color: #9ca3af;">Thinking…</p>}
                      </div>
                    )}
                  </>
                )}
                <p style="margin: 1rem 0 0 0; font-size: 0.75rem; color: #9ca3af; line-height: 1.5;">
                  AI-generated for reflection and guidance only. It is not a prediction, and not medical, legal or financial advice.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Search */}
        {activeTab.value === 'dreams' && (
          <div style="position: relative; margin-bottom: 1rem;">
            <MagnifyingGlassIcon style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); width: 1.25rem; height: 1.25rem; color: #9ca3af;" />
            <input
              type="text"
              class="search-input"
              placeholder="Search dreams..."
              value={searchQuery.value}
              onInput={(e) => { searchQuery.value = e.target.value; filterDreams(); }}
            />
          </div>
        )}

        {/* Categories */}
        {activeTab.value === 'dreams' && (
          <div style="display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.5rem; margin-bottom: 1.5rem; scrollbar-width: none;">
            {categories.map(cat => (
              <button
                key={cat}
                class={`category-chip ${selectedCategory.value === cat || (!selectedCategory.value && cat === 'All') ? 'active' : ''}`}
                onClick={() => { selectedCategory.value = cat === 'All' ? '' : cat; filterDreams(); }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Dream List */}
        {activeTab.value === 'dreams' && (
          loading.value ? (
            <div style="text-align: center; padding: 3rem;">
              <div class="spinner-border text-primary" role="status"></div>
            </div>
          ) : filteredDreams.value.length === 0 ? (
          <div style="text-align: center; padding: 3rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🌙</div>
            {searchQuery.value ? (
              <>
                <p style="color: #6b7280; font-size: 1.1rem; margin-bottom: 0.5rem;">No dreams found for "{searchQuery.value}"</p>
                <p style="color: #9ca3af; font-size: 0.9rem; margin-bottom: 1.5rem;">Can't find your dream? Request it!</p>
                <button 
                  onClick={openRequestModal}
                  style="background: #6366f1; color: white; padding: 0.75rem 1.5rem; border-radius: 12px; border: none; font-weight: 600; cursor: pointer; font-size: 1rem; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); transition: all 0.3s ease;"
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  📝 Request This Dream
                </button>
              </>
            ) : (
              <p style="color: #6b7280; font-size: 1.1rem;">No dreams found</p>
            )}
          </div>
        ) : (
          <div style="display: grid; gap: 1rem;">
            {filteredDreams.value.map(dream => (
              <div key={dream._id} class="dream-card" onClick={() => viewDream(dream)}>
                <div style="display: flex; gap: 1rem;">
                  {dream.thumbnailUrl && (
                    <img src={dream.thumbnailUrl} alt={dream.symbolName} style="width: 80px; height: 80px; border-radius: 12px; object-fit: cover; flex-shrink: 0;" />
                  )}
                  <div style="flex: 1; min-width: 0;">
                    <h3 style="margin: 0 0 0.25rem 0; font-size: 1.1rem; font-weight: 700; color: #1f2937;">{dream.symbolName}</h3>
                    {dream.symbolNameHindi && (
                      <p style="margin: 0 0 0.5rem 0; color: #6b7280; font-size: 0.9rem;">{dream.symbolNameHindi}</p>
                    )}
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                      <span style="background: #e0e7ff; color: #4338ca; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">{dream.category}</span>
                      {dream.subcategory && (
                        <span style="background: #f3f4f6; color: #6b7280; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem;">{dream.subcategory}</span>
                      )}
                    </div>
                    {dream.shortDescription && (
                      <p style="margin: 0; color: #6b7280; font-size: 0.875rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        {dream.shortDescription}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* My Requests List */}
        {activeTab.value === 'requests' && (
          loading.value ? (
            <div style="text-align: center; padding: 3rem;">
              <div class="spinner-border text-primary" role="status"></div>
            </div>
          ) : myRequests.value.length === 0 ? (
            <div style="text-align: center; padding: 3rem;">
              <InboxIcon style="width: 4rem; height: 4rem; color: #d1d5db; margin: 0 auto 1rem;" />
              <p style="color: #6b7280; font-size: 1.1rem; margin-bottom: 1rem;">No requests yet</p>
              <button
                onClick={() => activeTab.value = 'dreams'}
                style="background: #6366f1; color: white; padding: 0.75rem 1.5rem; border-radius: 12px; border: none; font-weight: 600; cursor: pointer; font-size: 1rem;"
              >
                Browse Dreams
              </button>
            </div>
          ) : (
            <div style="display: grid; gap: 1rem;">
              {myRequests.value.map(request => {
                const statusColors = {
                  'Pending': { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
                  'In Progress': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
                  'Completed': { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
                  'Rejected': { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' }
                };
                const colors = statusColors[request.status];
                return (
                  <div key={request._id} style={`background: white; border-radius: 16px; padding: 1rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-left: 4px solid ${colors.border};`}>
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                      <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #1f2937;">{request.dreamSymbol}</h3>
                      <span style={`background: ${colors.bg}; color: ${colors.text}; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; white-space: nowrap;`}>
                        {request.status}
                      </span>
                    </div>
                    {request.additionalDetails && (
                      <p style="margin: 0 0 0.75rem 0; color: #6b7280; font-size: 0.875rem;">{request.additionalDetails}</p>
                    )}
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #9ca3af;">
                      <span>{new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {request.status === 'Completed' && (
                        <button
                          onClick={() => {
                            // Find the completed dream and show it
                            if (request.completedDreamId) {
                              const completedDream = dreamList.value.find(d => d._id === request.completedDreamId);
                              if (completedDream) {
                                viewDream(completedDream);
                              } else {
                                // Dream not in current list, switch to dreams tab
                                activeTab.value = 'dreams';
                                toast.info('Please search for the dream in the Dreams tab');
                              }
                            } else {
                              activeTab.value = 'dreams';
                              toast.info('Dream is ready! Check the Dreams tab');
                            }
                          }}
                          style="background: #6366f1; color: white; padding: 0.375rem 0.75rem; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; font-size: 0.75rem;"
                        >
                          View Dream →
                        </button>
                      )}
                    </div>
                    {request.adminNotes && (
                      <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 0.25rem 0; font-size: 0.75rem; color: #6b7280; font-weight: 600;">Admin Note:</p>
                        <p style="margin: 0; font-size: 0.875rem; color: #374151;">{request.adminNotes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Detail Modal */}
        {showDetailModal.value && selectedDream.value && (
          <div class="modal-overlay" onClick={closeModal}>
            <div class="modal-content" onClick={(e) => e.stopPropagation()}>
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <h2 style="margin: 0; font-size: 1.5rem; font-weight: 800; color: #1f2937;">{selectedDream.value.symbolName}</h2>
                <button onClick={closeModal} style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">×</button>
              </div>

              {selectedDream.value.thumbnailUrl && (
                <img src={selectedDream.value.thumbnailUrl} alt={selectedDream.value.symbolName} style="width: 100%; height: auto; max-height: 250px; object-fit: contain; border-radius: 12px; margin-bottom: 1rem; background: #f3f4f6;" />
              )}

              {selectedDream.value.symbolNameHindi && (
                <p style="margin: 0 0 1rem 0; color: #6b7280; font-size: 1.1rem; font-weight: 500;">{selectedDream.value.symbolNameHindi}</p>
              )}

              <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                <span style="background: #e0e7ff; color: #4338ca; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600;">{selectedDream.value.category}</span>
                {selectedDream.value.subcategory && (
                  <span style="background: #f3f4f6; color: #6b7280; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem;">{selectedDream.value.subcategory}</span>
                )}
              </div>

              {selectedDream.value.shortDescription && (
                <div style="margin-bottom: 1.5rem;">
                  <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">Short Description</h4>
                  <p style="margin: 0; color: #374151; line-height: 1.6;">{selectedDream.value.shortDescription}</p>
                </div>
              )}

              {selectedDream.value.detailedInterpretation && (
                <div style="margin-bottom: 1.5rem;">
                  <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">Detailed Interpretation</h4>
                  <p style="margin: 0; color: #374151; line-height: 1.6;">{selectedDream.value.detailedInterpretation}</p>
                </div>
              )}

              {selectedDream.value.positiveAspects?.length > 0 && (
                <div style="margin-bottom: 1.5rem;">
                  <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 700; color: #059669; text-transform: uppercase;">✅ Positive Aspects</h4>
                  {selectedDream.value.positiveAspects.map((aspect, idx) => (
                    <div key={idx} style="background: #d1fae5; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem;">
                      <p style="margin: 0 0 0.25rem 0; font-weight: 600; color: #065f46;">{aspect.point}</p>
                      <p style="margin: 0; color: #047857; font-size: 0.875rem;">{aspect.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedDream.value.negativeAspects?.length > 0 && (
                <div style="margin-bottom: 1.5rem;">
                  <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 700; color: #dc2626; text-transform: uppercase;">⚠️ Negative Aspects</h4>
                  {selectedDream.value.negativeAspects.map((aspect, idx) => (
                    <div key={idx} style="background: #fee2e2; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem;">
                      <p style="margin: 0 0 0.25rem 0; font-weight: 600; color: #991b1b;">{aspect.point}</p>
                      <p style="margin: 0; color: #b91c1c; font-size: 0.875rem;">{aspect.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedDream.value.astrologicalSignificance && (
                <div style="margin-bottom: 1.5rem;">
                  <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">🪐 Astrological Significance</h4>
                  <p style="margin: 0; color: #374151; line-height: 1.6;">{selectedDream.value.astrologicalSignificance}</p>
                </div>
              )}

              {selectedDream.value.vedicReferences && (
                <div style="margin-bottom: 1.5rem;">
                  <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">📖 Vedic References</h4>
                  <p style="margin: 0; color: #374151; line-height: 1.6;">{selectedDream.value.vedicReferences}</p>
                </div>
              )}

              {(selectedDream.value.remedies?.mantras?.length > 0 || selectedDream.value.remedies?.pujas?.length > 0) && (
                <div style="margin-bottom: 1.5rem;">
                  <h4 style="margin: 0 0 0.5rem 0; font-size: 0.875rem; font-weight: 700; color: #6b7280; text-transform: uppercase;">🙏 Remedies</h4>
                  {selectedDream.value.remedies.mantras?.filter(m => m).length > 0 && (
                    <div style="margin-bottom: 0.75rem;">
                      <p style="margin: 0 0 0.25rem 0; font-weight: 600; color: #374151; font-size: 0.875rem;">Mantras:</p>
                      <ul style="margin: 0; padding-left: 1.25rem; color: #6b7280;">
                        {selectedDream.value.remedies.mantras.filter(m => m).map((mantra, idx) => (
                          <li key={idx}>{mantra}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedDream.value.remedies.pujas?.filter(p => p).length > 0 && (
                    <div>
                      <p style="margin: 0 0 0.25rem 0; font-weight: 600; color: #374151; font-size: 0.875rem;">Pujas:</p>
                      <ul style="margin: 0; padding-left: 1.25rem; color: #6b7280;">
                        {selectedDream.value.remedies.pujas.filter(p => p).map((puja, idx) => (
                          <li key={idx}>{puja}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <button onClick={closeModal} style="width: 100%; padding: 0.75rem; background: #6366f1; color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; font-size: 1rem;">
                Close
              </button>
            </div>
          </div>
        )}

        {/* Request Modal */}
        {showRequestModal.value && (
          <div class="modal-overlay" onClick={closeRequestModal}>
            <div class="modal-content" onClick={(e) => e.stopPropagation()} style="max-width: 500px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; font-size: 1.5rem; font-weight: 800; color: #1f2937;">Request Dream Meaning</h2>
                <button onClick={closeRequestModal} style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280;">×</button>
              </div>

              <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <p style="margin: 0; color: #1e40af; font-size: 0.875rem; line-height: 1.5;">
                  <strong>📌 Note:</strong> Your request will be reviewed by our team. We'll notify you via email when the dream meaning is added to our database.
                </p>
              </div>

              <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Dream Symbol *</label>
                <input
                  type="text"
                  value={requestForm.value.dreamSymbol}
                  onInput={(e) => requestForm.value.dreamSymbol = e.target.value}
                  placeholder="e.g., Elephant, Flying, Temple"
                  style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem;"
                />
              </div>

              <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151;">Additional Details (Optional)</label>
                <textarea
                  value={requestForm.value.additionalDetails}
                  onInput={(e) => requestForm.value.additionalDetails = e.target.value}
                  placeholder="Describe your dream in more detail..."
                  rows="4"
                  style="width: 100%; padding: 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; resize: vertical;"
                ></textarea>
              </div>

              <div style="display: flex; gap: 0.75rem;">
                <button
                  onClick={submitRequest}
                  disabled={loading.value}
                  style="flex: 1; background: #6366f1; color: white; padding: 0.75rem; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 1rem;"
                >
                  {loading.value ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  onClick={closeRequestModal}
                  style="flex: 1; background: #f3f4f6; color: #374151; padding: 0.75rem; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; font-size: 1rem;"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
};
