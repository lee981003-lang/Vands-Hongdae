import { useCallback, useEffect, useMemo, useState } from "react";
import { DateRangePicker, type DateRange } from "./DateRangePicker";
import { addDays, kstToday } from "../lib/time";
import { supabase } from "../lib/supabase";
type Entry={id:number;actor_username:string|null;action:string;room_name:string;bed_label:string;before:Record<string,unknown>;after:Record<string,unknown>;created_at:string};
const action:Record<string,string>={bed_status_change:"상태 변경",bed_memo_change:"메모 변경",bed_flags_change:"처방/후불 변경",bed_follow_up_change:"후속 관리 변경",bed_details_change:"고객/시술 변경"};
const field:Record<string,string>={status:"상태",customer_name:"고객명",treatment_name:"시술명",prescription_status:"처방",postpay_status:"후불",is_follow_up:"후속 관리",memo:"메모"};
const values:Record<string,string>={empty:"빈 룸",in_treatment:"시술 중",waiting:"시술 대기",none:"없음",pending:"대기",done:"완료"};
const label=new Intl.DateTimeFormat("ko-KR",{month:"long",day:"numeric"});
const param=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const value=(v:unknown)=>v===null||v===""?"없음":v===true?"예":v===false?"아니오":typeof v==="string"?values[v]??v:String(v);
const change=(before:Record<string,unknown>,after:Record<string,unknown>)=>Object.keys(after).filter((key)=>before[key]!==after[key]).map((key)=>`${field[key]??key}: ${value(before[key])} → ${value(after[key])}`).join(" · ");
const dateTime=(v:string)=>new Intl.DateTimeFormat("ko-KR",{dateStyle:"short",timeStyle:"short"}).format(new Date(v));
export function ActivityLog(){
 const [entries,setEntries]=useState<Entry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[range,setRange]=useState<DateRange|null>(null),[open,setOpen]=useState(false);
 const {minDate,maxDate}=useMemo(()=>{const today=kstToday();return {minDate:addDays(today,-29),maxDate:today}},[]);
 const load=useCallback(async()=>{if(!supabase){setError("Supabase 연결 설정을 확인해 주세요.");setLoading(false);return}setLoading(true);setError(null);const {data,error:rpcError}=await supabase.rpc("get_activity_log",{p_limit:50,p_offset:0,p_start_date:range?param(range.start):null,p_end_date:range?param(range.end):null});if(rpcError)setError("활동 로그를 불러올 수 없습니다.");else setEntries((data??[]) as Entry[]);setLoading(false)},[range]);
 useEffect(()=>{void load()},[load]);
 return <section className="activity-log" role="tabpanel" aria-label="활동 로그"><div className="activity-log__heading"><div><h1>활동 로그</h1><p>최근 베드 상태와 정보 변경 이력입니다.</p></div><div className="activity-log__actions"><button className="date-range-trigger" type="button" onClick={()=>setOpen(true)}>{range?`${label.format(range.start)} ~ ${label.format(range.end)}`:"조회 기간 선택"}</button><button className="admin-card__button" type="button" onClick={()=>setRange(null)} disabled={loading||!range}>전체 보기</button><button className="admin-card__button" type="button" onClick={()=>void load()} disabled={loading}>새로고침</button></div></div>
 {loading?<p className="activity-log__empty">활동 로그를 불러오는 중입니다.</p>:null}{error?<p className="activity-log__empty">{error}</p>:null}{!loading&&!error&&entries.length===0?<p className="activity-log__empty">{range?"선택한 기간에 기록된 활동이 없습니다.":"최근 30일 동안 기록된 활동이 없습니다."}</p>:null}
 {!loading&&!error&&entries.length>0?<div className="activity-log__table-wrap"><table><thead><tr><th>시각</th><th>작업자</th><th>대상</th><th>작업</th><th>변경 내용</th></tr></thead><tbody>{entries.map((entry)=><tr key={entry.id}><td>{dateTime(entry.created_at)}</td><td>{entry.actor_username||"알 수 없음"}</td><td>{entry.room_name} · {entry.bed_label}</td><td>{action[entry.action]??entry.action}</td><td>{change(entry.before,entry.after)}</td></tr>)}</tbody></table></div>:null}
 <DateRangePicker open={open} title="조회 기간을 선택하세요" description="기간은 최근 30일 내에서 선택할 수 있어요." value={range} minDate={minDate} maxDate={maxDate} maxRangeDays={30} onConfirm={setRange} onClose={()=>setOpen(false)}/></section>
}