using System;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
using System.Security.Principal;
using System.Text.RegularExpressions;

namespace SzLessonOwned {
 public sealed class NativeFailure : Exception {
  public readonly string Operation; public readonly int NativeCode;
  internal NativeFailure(string operation,int code):base("Native probe refusal") {Operation=operation;NativeCode=code;}
 }
 public sealed class JobHandle : SafeHandleZeroOrMinusOneIsInvalid {
  public bool ReleaseSucceeded;public int ReleaseCode;
  public string Name {get;internal set;}
  internal uint CreatorPid;internal string CreatorBirth;
  public JobHandle():base(true) {} protected override bool ReleaseHandle(){ReleaseSucceeded=Api.CloseHandle(handle);ReleaseCode=ReleaseSucceeded?0:Marshal.GetLastWin32Error();return ReleaseSucceeded;}
 }
 [StructLayout(LayoutKind.Sequential)] internal struct FileTime {public uint Low,High; public ulong Value {get{return ((ulong)High<<32)|Low;}}}
 [StructLayout(LayoutKind.Sequential)] internal struct SecurityAttributes {public int Length;public IntPtr Descriptor;public int Inherit;}
 [StructLayout(LayoutKind.Sequential)] internal struct BasicLimit {
  public long ProcessTime,JobTime;public uint Flags;public UIntPtr MinWS,MaxWS;public uint ActiveLimit;public UIntPtr Affinity;public uint Priority,Scheduling;
 }
 [StructLayout(LayoutKind.Sequential)] internal struct IoCounters {public ulong A,B,C,D,E,F;}
 [StructLayout(LayoutKind.Sequential)] internal struct ExtendedLimit {public BasicLimit Basic;public IoCounters Io;public UIntPtr ProcessMemory,JobMemory,PeakProcessMemory,PeakJobMemory;}
 [StructLayout(LayoutKind.Sequential)] internal struct Accounting {public long A,B,C,D;public uint Faults,Total,Active,Terminated;}
 [StructLayout(LayoutKind.Sequential)] internal struct Memory {public uint Size,Faults;public UIntPtr PeakWS,WS,PeakPaged,Paged,PeakNonPaged,NonPaged,Pagefile,PeakPagefile,Private;}
 internal static class Api {
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] internal static extern JobHandle CreateJobObjectW(IntPtr security,string name);
  [DllImport("kernel32.dll",EntryPoint="CreateJobObjectW",CharSet=CharSet.Unicode,SetLastError=true)] internal static extern JobHandle CreateNamedJob(ref SecurityAttributes security,string name);
  [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] internal static extern JobHandle OpenJobObjectW(uint access,bool inherit,string name);
  [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] internal static extern bool ConvertStringSecurityDescriptorToSecurityDescriptorW(string text,uint revision,out IntPtr descriptor,out uint size);
  [DllImport("kernel32.dll")] internal static extern IntPtr LocalFree(IntPtr memory);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool AssignProcessToJobObject(JobHandle job,SafeProcessHandle process);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool TerminateJobObject(JobHandle job,uint code);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool IsProcessInJob(SafeProcessHandle process,JobHandle job,out bool result);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern SafeProcessHandle OpenProcess(uint access,bool inherit,uint pid);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern uint GetProcessId(SafeProcessHandle process);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool GetProcessTimes(SafeProcessHandle process,out FileTime creation,out FileTime exit,out FileTime kernel,out FileTime user);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern uint WaitForSingleObject(SafeProcessHandle process,uint milliseconds);
  [DllImport("kernel32.dll",SetLastError=true)] internal static extern bool GetExitCodeProcess(SafeProcessHandle process,out uint code);
  [DllImport("psapi.dll",SetLastError=true)] internal static extern bool GetProcessMemoryInfo(SafeProcessHandle process,ref Memory counters,uint size);
  [DllImport("kernel32.dll",EntryPoint="QueryInformationJobObject",SetLastError=true)] internal static extern bool QueryLimit(JobHandle job,int kind,out ExtendedLimit data,uint size,out uint length);
  [DllImport("kernel32.dll",EntryPoint="QueryInformationJobObject",SetLastError=true)] internal static extern bool QueryAccounting(JobHandle job,int kind,out Accounting data,uint size,out uint length);
  [DllImport("kernel32.dll",EntryPoint="QueryInformationJobObject",SetLastError=true)] internal static extern bool QueryUi(JobHandle job,int kind,out uint data,uint size,out uint length);
  [DllImport("kernel32.dll",EntryPoint="QueryInformationJobObject",SetLastError=true)] internal static extern bool QueryList(JobHandle job,int kind,IntPtr data,uint size,out uint length);
 }
 public sealed class JobState {public uint Total,Active,Terminated,Flags,Ui;public uint[] Pids;public int BufferGrowths;}
 public sealed class ProcessState {public uint Pid,ExitCode;public string CreationFileTime;public bool Exited;public ulong? WorkingSetBytes,PrivateBytes;}
 public sealed class Member : IDisposable {
  internal readonly SafeProcessHandle Handle;public readonly uint Pid;public readonly string CreationFileTime;
  internal Member(SafeProcessHandle handle,uint pid){Handle=handle;Pid=pid;CreationFileTime=Native.Birth(handle);}
  public bool HasExited(){return Native.Exited(Handle);}
  public ProcessState Read(){
   var result=new ProcessState{Pid=Pid,CreationFileTime=Native.Birth(Handle)};
   if(result.CreationFileTime!=CreationFileTime)throw new NativeFailure("CreationChanged",0);
   result.Exited=Native.Exited(Handle);
   if(!result.Exited){
    var memory=new Memory{Size=(uint)Marshal.SizeOf(typeof(Memory))};
    if(Api.GetProcessMemoryInfo(Handle,ref memory,memory.Size)){result.WorkingSetBytes=memory.WS.ToUInt64();result.PrivateBytes=memory.Private.ToUInt64();}
    else {int error=Marshal.GetLastWin32Error();if(!Native.Exited(Handle))throw new NativeFailure("GetProcessMemoryInfo",error);result.Exited=true;}
   }
   if(result.Exited){uint code;if(!Api.GetExitCodeProcess(Handle,out code))throw Native.Error("GetExitCodeProcess");result.ExitCode=code;}
   return result;
  }
  public void Dispose(){Handle.Dispose();}
 }
 public static class Native {
  internal static NativeFailure Error(string operation){return new NativeFailure(operation,Marshal.GetLastWin32Error());}
  static void AssertName(string name){if(name==null||!Regex.IsMatch(name,@"^Local\\SistemaZero-QA-[a-f0-9]{32}$",RegexOptions.CultureInvariant))throw new NativeFailure("InvalidJobName",0);}
  public static JobHandle CreateNamed(string name){
   AssertName(name);IntPtr descriptor=IntPtr.Zero;uint size;
   string sid;using(var identity=WindowsIdentity.GetCurrent()){sid=identity.User.Value;}
   if(!Api.ConvertStringSecurityDescriptorToSecurityDescriptorW("D:P(A;;0x1F001F;;;"+sid+")",1,out descriptor,out size))throw Error("JobSecurityDescriptor");
   try{
    var attributes=new SecurityAttributes{Length=Marshal.SizeOf(typeof(SecurityAttributes)),Descriptor=descriptor,Inherit=0};
    var job=Api.CreateNamedJob(ref attributes,name);int error=Marshal.GetLastWin32Error();
    if(job.IsInvalid){job.Dispose();throw new NativeFailure("CreateNamedJob",error);}
    if(error==183){job.Dispose();throw new NativeFailure("JobNameCollision",error);}
    try{AssertFlags(job);job.Name=name;return job;}catch{job.Dispose();throw;}
   }finally{if(descriptor!=IntPtr.Zero)Api.LocalFree(descriptor);}
  }
  public static JobHandle OpenQuery(string name){AssertName(name);var job=Api.OpenJobObjectW(0x4,false,name);int error=Marshal.GetLastWin32Error();if(job.IsInvalid){job.Dispose();throw new NativeFailure("OpenJobQuery",error);}try{AssertFlags(job);job.Name=name;return job;}catch{job.Dispose();throw;}}
  public static void Assign(JobHandle job,SafeProcessHandle process){if(job.CreatorBirth!=null)throw new NativeFailure("JobAlreadyAssigned",0);if(!Api.AssignProcessToJobObject(job,process))throw Error("AssignProcessToJobObject");if(!Contains(job,process))throw new NativeFailure("AssignedMembership",0);uint pid=Api.GetProcessId(process);if(pid==0)throw Error("GetProcessId");job.CreatorBirth=Birth(process);job.CreatorPid=pid;}
  public static bool Contains(JobHandle job,SafeProcessHandle process){bool result;if(!Api.IsProcessInJob(process,job,out result))throw Error("IsProcessInJob");return result;}
  internal static string Birth(SafeProcessHandle process){FileTime created,exited,kernel,user;if(!Api.GetProcessTimes(process,out created,out exited,out kernel,out user))throw Error("GetProcessTimes");return created.Value.ToString(CultureInfo.InvariantCulture);}
  public static string ReadBirth(SafeProcessHandle process){return Birth(process);}
  public static void EmergencyTerminateOwned(JobHandle job,SafeProcessHandle creator,string expectedBirth){AssertFlags(job);uint pid=Api.GetProcessId(creator);if(pid==0)throw Error("GetProcessId");if(job.CreatorBirth==null||job.CreatorBirth!=expectedBirth||job.CreatorPid!=pid||Birth(creator)!=expectedBirth)throw new NativeFailure("EmergencyCreatorMismatch",0);if(!Api.TerminateJobObject(job,0xE0000001))throw Error("TerminateOwnedJob");}
  internal static bool Exited(SafeProcessHandle process){uint value=Api.WaitForSingleObject(process,0);if(value==0)return true;if(value==258)return false;throw Error("WaitForSingleObject");}
  public static Member Capture(JobHandle job,uint pid){
   var process=Api.OpenProcess(0x1000|0x100000,false,pid);
   try{if(process.IsInvalid)throw Error("OpenProcess");if(!Contains(job,process))throw new NativeFailure("Membership",0);uint actual=Api.GetProcessId(process);if(actual==0)throw Error("GetProcessId");if(actual!=pid)throw new NativeFailure("ProcessIdMismatch",0);return new Member(process,pid);}
   catch{process.Dispose();throw;}
  }
  public static void AssertFlags(JobHandle job){ExtendedLimit limits;uint length,ui;if(!Api.QueryLimit(job,9,out limits,(uint)Marshal.SizeOf(typeof(ExtendedLimit)),out length))throw Error("QueryLimits");if(!Api.QueryUi(job,4,out ui,4,out length))throw Error("QueryUi");if(limits.Basic.Flags!=0||ui!=0)throw new NativeFailure("UnexpectedJobLimits",0);}
  public static JobState Read(JobHandle job,int maximum=1024){
   if(maximum<1||maximum>65536)throw new NativeFailure("InvalidCapacity",0);
   AssertFlags(job);Accounting accounting;uint length;
   if(!Api.QueryAccounting(job,1,out accounting,(uint)Marshal.SizeOf(typeof(Accounting)),out length))throw Error("QueryAccounting");
   int capacity=1,growths=0;
   while(true){
    int size=checked(8+capacity*IntPtr.Size);IntPtr buffer=Marshal.AllocHGlobal(size);
    try{
     bool ok=Api.QueryList(job,3,buffer,(uint)size,out length);int error=ok?0:Marshal.GetLastWin32Error();
     if(!ok&&error!=234)throw new NativeFailure("QueryMembers",error);
     uint assigned=ok?(uint)Marshal.ReadInt32(buffer,0):0,listed=ok?(uint)Marshal.ReadInt32(buffer,4):0;
     if(ok&&assigned<listed)throw new NativeFailure("InvalidMemberCount",0);
     if(ok&&assigned==listed){
      if(listed>capacity)throw new NativeFailure("InvalidMemberCount",0);
      var pids=new uint[listed];var seen=new HashSet<uint>();
      for(int i=0;i<listed;i++){long pid=Marshal.ReadIntPtr(buffer,8+i*IntPtr.Size).ToInt64();if(pid<=0||pid>uint.MaxValue||!seen.Add((uint)pid))throw new NativeFailure("InvalidMemberPid",0);pids[i]=(uint)pid;}
      return new JobState{Total=accounting.Total,Active=accounting.Active,Terminated=accounting.Terminated,Flags=0,Ui=0,Pids=pids,BufferGrowths=growths};
     }
    }finally{Marshal.FreeHGlobal(buffer);}
    if(capacity>=maximum)throw new NativeFailure("MemberBufferBound",0);capacity=Math.Min(maximum,capacity*2);growths++;
   }
  }
 }
}
