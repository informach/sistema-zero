import {test,expect} from 'bun:test'
import {randomUUID} from 'node:crypto'
import {PublicAuthorIdentities} from '../../../packages/hub/src/application/public-author-identities'
import {buildApp,grantLifetime,seedSampleCourse} from '../../../packages/members/tests/helpers'
import {LiveService} from '../../../packages/members/src/application/live/live.service'
import {InMemoryLiveCourses,InMemoryLiveRepository} from '../../../packages/members/tests/fakes/live-in-memory'

test('R02: legacy default child must use current public nickname even when account and profile share an ID',async()=>{
 const id=randomUUID();let calls=0
 const identities=new PublicAuthorIdentities({getPublicProfileIdentities:async()=>{calls++;return new Map([[id,{publicNickname:'Fada Azul',publicProfileEnabled:false}]])}})
 const result=await identities.one({authorId:id,authorAccountId:id,authorDisplayName:'Nome Privado Antigo',authorPublic:true},'kids')
 console.log(JSON.stringify({case:'legacy-hub',lookupCalls:calls,actualName:result.authorDisplayName,actualPublic:result.authorPublic}))
 expect(result.authorDisplayName).toBe('Fada Azul');expect(result.authorPublic).toBe(false)
})

test('R03: legacy default child must not bypass certificate identity confirmation',async()=>{
 const id=randomUUID();let lookups=0
 const ctx=buildApp({authGateway:{getAccountIdentities:async()=>[],getProfileNames:async()=>new Map(),getProfileIdentities:async()=>new Map(),getCertificateIdentity:async()=>{lookups++;return {fullName:'Nome privado confirmado',confirmed:false}}}})
 const {courseId,moduleId,lessonIds,slug}=seedSampleCourse(ctx.courses,'qa-cert-legacy','published','kids')
 grantLifetime(ctx.entitlements,{userId:id,courseRef:slug})
 for(const lesson of lessonIds)await ctx.progress.markComplete(id,lesson,courseId,new Date())
 const lessonId=randomUUID(),blockId=randomUUID()
 ctx.courses.lessons.push({id:lessonId,moduleId,courseId,slug:'certificado',title:'Certificado',sortOrder:9,estimatedMinutes:null,isPublished:true})
 ctx.courses.blocks.push({id:blockId,lessonId,kind:'certificate',sortOrder:0,content:{kind:'certificate',issuerName:'QA'}})
 const r=await ctx.app.handle(new Request(`http://localhost/members/lessons/${lessonId}/blocks/${blockId}/certificate`,{method:'POST',headers:{'x-auth-user-id':id,'x-auth-account-id':id,'x-auth-profile-name':'Apelido Público','x-auth-kids-context':'student','x-auth-user-name':'Apelido Público','content-type':'application/json'}}))
 const body=await r.json()
 console.log(JSON.stringify({case:'legacy-certificate',status:r.status,lookupCalls:lookups,name:body.certificate?.studentName,error:body.error?.code}))
 expect(r.status).toBe(409);expect(body.error?.code).toBe('PROFILE_IDENTITY_REQUIRED')
})

test('R04: live classroom must use the complete current nickname instead of old enrollment name',async()=>{
 const teacher={id:randomUUID(),accountId:randomUUID(),name:'Professora QA',staff:true}
 const learner={id:randomUUID(),accountId:randomUUID(),name:'Fada Azul',staff:false}
 const repo=new InMemoryLiveRepository(),courses=new InMemoryLiveCourses()
 const {course}=courses.add({lessons:1})
 const service=new LiveService(repo,()=>new Date('2026-11-07T17:00:00Z'),{assertOwnership:async()=>({name:'Nome Real Antigo'})},{courses,mediaReady:true,publicIdentities:{getProfileNames:async()=>new Map([[learner.id,learner.name]])}})
 const {cohort,sessions}=await service.createCohort(teacher,course.id,{title:'QA',timeZone:'America/Sao_Paulo',capacity:8,accessDays:30,teacherIds:[teacher.id],schedule:[{startsAt:'2026-11-07T17:00:00Z',endsAt:'2026-11-07T18:00:00Z'}]})
 await service.updateCohort({...teacher,admin:true},cohort.id,{status:'open'})
 await service.enroll(teacher,cohort.id,{accountId:learner.accountId,learnerId:learner.id,learnerName:'Nome ignorado'})
 const session=sessions[0]!
 const room=await service.room(teacher,session.id)
 await service.control(teacher,session.id,room.occurrence!.version,{kind:'start'})
 const joined=await service.join(learner,session.id,{deviceId:randomUUID(),takeover:false})
 const actual=joined.occurrence!.participants[0]!.displayName
 console.log(JSON.stringify({case:'live-classroom',actualName:actual,currentNickname:learner.name}))
 expect(actual).toBe('Fada Azul')
})
import { createRequire } from 'node:module'
import { PurchaseForm } from '../../../packages/member-shell/src/components/commerce/purchase-form'

test('R05: checkout must describe the actual billing interval of a valid quarterly offer',()=>{
 const require=createRequire(new URL('../../../packages/member-shell/package.json',import.meta.url))
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
 const offer={id:randomUUID(),slug:'plano-trimestral',name:'Plano trimestral',status:'active',isAvailable:true,priceCents:9000,pricingMode:'subscription',billingIntervalMonths:3,installmentsMax:null,accessMode:'billing_cycle',accessDurationValue:null,accessDurationUnit:null,product:{id:randomUUID(),sku:'PLANO',name:'Plano',audience:'kids',status:'active'},content:null,includes:[]}
 const view={mode:'purchase',checkoutId:randomUUID(),origin:{kind:'promotion',offerRef:offer.slug},offer,contact:{nome:'Responsável QA',email:'qa@example.invalid',cpf:'',telefone:''},birth:'',address:null,status:'READY',accessGranted:false,payment:null,termsUrl:'https://example.invalid/termos',privacyUrl:'https://example.invalid/privacidade',termsVersion:'v1',config:{kind:'purchase',offerRef:offer.slug}}
 const html=renderToStaticMarkup(React.createElement(PurchaseForm,{view,busy:false,onPay:async()=>{}}))
 console.log(JSON.stringify({case:'quarterly-price',actualLabel:html.match(/R\$[^<]+<[^>]+>[^<]*/)?.[0]??html.slice(0,230),declaredMonths:3,renderedMonthly:html.includes('por mês')}))
 expect(html.includes('por mês')).toBe(false)
})
