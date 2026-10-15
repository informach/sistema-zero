param([Parameter(Mandatory=$true)][string]$OutputFile)
$ErrorActionPreference = 'Stop'
# The parent owns stdin. Closing it revokes the job, including descendants.
$source = @'
using System;
using System.Text;
using System.Threading;
using System.Runtime.InteropServices;
public static class ZeroJob {
  [StructLayout(LayoutKind.Sequential)] struct SECURITY_ATTRIBUTES {public int length;public IntPtr descriptor;public int inherit;}
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool CreatePipe(out IntPtr read,out IntPtr write,ref SECURITY_ATTRIBUTES attributes,uint size);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetHandleInformation(IntPtr handle,uint mask,uint flags);
  public static int Main() {
    try {
      string encoded=Environment.GetEnvironmentVariable("ZERO_PROCESS_REQUEST");Environment.SetEnvironmentVariable("ZERO_PROCESS_REQUEST",null);
      var request=new System.Web.Script.Serialization.JavaScriptSerializer().Deserialize<System.Collections.Generic.Dictionary<string,object>>(Encoding.UTF8.GetString(Convert.FromBase64String(encoded)));
      if(request.ContainsKey("lock"))return HoldLock((string)request["lock"]);
      var list=(System.Collections.ArrayList)request["arguments"];string[] args=new string[list.Count];for(int i=0;i<list.Count;i++)args[i]=(string)list[i];
      var terminal=request.ContainsKey("terminal")?request["terminal"] as System.Collections.Generic.Dictionary<string,object>:null;
      return Run((string)request["executable"],args,(string)request["cwd"],Convert.ToUInt64(request["memoryMb"]),Convert.ToUInt32(request["pids"]),terminal);
    } catch(Exception error) {Console.Error.WriteLine(error.ToString());return 125;}
  }
  static int HoldLock(string identity) {
    if(!System.Text.RegularExpressions.Regex.IsMatch(identity,"^[a-f0-9]{24}$"))throw new ArgumentException("Invalid lock identity");
    var user=System.Security.Principal.WindowsIdentity.GetCurrent().User;
    var security=new System.Security.AccessControl.MutexSecurity();security.SetAccessRuleProtection(true,false);
    security.AddAccessRule(new System.Security.AccessControl.MutexAccessRule(user,System.Security.AccessControl.MutexRights.FullControl,System.Security.AccessControl.AccessControlType.Allow));
    bool created;using(var mutex=new Mutex(false,"Global\\SistemaZero-"+user.Value+"-"+identity,out created,security)) {
      bool held=false;try {
        try{held=mutex.WaitOne(0);}catch(AbandonedMutexException){held=true;}
        if(!held){Console.Error.WriteLine("PROFILE_BUSY");return 73;}
        Console.WriteLine("LOCKED");Console.Out.Flush();Console.ReadLine();return 0;
      } finally {if(held)mutex.ReleaseMutex();}
    }
  }
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFO { public int cb; public IntPtr reserved,desktop,title; public int x,y,cx,cy,xc,yc,fill,flags; public short show,reserved2; public IntPtr reserved3,input,output,error; }
  [StructLayout(LayoutKind.Sequential)] struct PROCESS_INFORMATION { public IntPtr process,thread; public uint pid,tid; }
  [StructLayout(LayoutKind.Sequential)] struct STARTUPINFOEX {public STARTUPINFO startup;public IntPtr attributes;}
  [StructLayout(LayoutKind.Sequential)] struct COORD {public short x,y; public COORD(int columns,int rows){if(columns<2||columns>500||rows<2||rows>500)throw new ArgumentException("Invalid terminal size");x=(short)columns;y=(short)rows;}}
  [DllImport("kernel32.dll")] static extern int CreatePseudoConsole(COORD size,IntPtr input,IntPtr output,uint flags,out IntPtr console);
  [DllImport("kernel32.dll")] static extern int ResizePseudoConsole(IntPtr console,COORD size);
  [DllImport("kernel32.dll")] static extern void ClosePseudoConsole(IntPtr console);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool InitializeProcThreadAttributeList(IntPtr list,int count,uint flags,ref IntPtr size);
  [DllImport("kernel32.dll",SetLastError=true)] static extern bool UpdateProcThreadAttribute(IntPtr list,uint flags,IntPtr attribute,IntPtr value,IntPtr size,IntPtr previous,IntPtr returned);
  [DllImport("kernel32.dll")] static extern void DeleteProcThreadAttributeList(IntPtr list);
  [DllImport("kernel32.dll",EntryPoint="CreateProcessW",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool CreateTerminalProcess(string application,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr environment,string cwd,ref STARTUPINFOEX info,out PROCESS_INFORMATION pi);
  [StructLayout(LayoutKind.Sequential)] struct BASIC_LIMIT { public long processTime,jobTime; public uint flags; public UIntPtr minWorking,maxWorking; public uint activeProcesses; public UIntPtr affinity; public uint priority,scheduling; }
  [StructLayout(LayoutKind.Sequential)] struct IO_COUNTERS { public ulong readOperations,writeOperations,otherOperations,readBytes,writeBytes,otherBytes; }
  [StructLayout(LayoutKind.Sequential)] struct EXTENDED_LIMIT { public BASIC_LIMIT basic; public IO_COUNTERS io; public UIntPtr processMemory,jobMemory,peakProcessMemory,peakJobMemory; }
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int type,ref EXTENDED_LIMIT info,uint size);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attributes,string name);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
  [DllImport("kernel32.dll", SetLastError=true)] static extern bool TerminateJobObject(IntPtr job,uint code);
  [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool CreateProcess(string application,StringBuilder command,IntPtr pa,IntPtr ta,bool inherit,uint flags,IntPtr environment,string cwd,ref STARTUPINFO info,out PROCESS_INFORMATION pi);
  [DllImport("kernel32.dll")] static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll")] static extern uint WaitForSingleObject(IntPtr handle,uint milliseconds);
  [DllImport("kernel32.dll")] static extern bool GetExitCodeProcess(IntPtr process,out uint code);
  [DllImport("kernel32.dll")] static extern bool TerminateProcess(IntPtr process,uint code);
  [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int handle);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  static string Quote(string value) { return "\"" + System.Text.RegularExpressions.Regex.Replace(value, "(\\\\*)\"", "$1$1\\\"") .TrimEnd('\0') + new string('\\', Trailing(value)) + "\""; }
  static int Trailing(string value) { int n=0; for(int i=value.Length-1;i>=0 && value[i]=='\\';i--)n++; return n; }
  public static int Run(string executable,string[] args,string cwd,ulong memoryMb,uint pids,System.Collections.Generic.Dictionary<string,object> terminal) {
    if(memoryMb<64||memoryMb>16384||pids<1||pids>256)throw new ArgumentException("Invalid job quota");
    IntPtr job=CreateJobObject(IntPtr.Zero,null); if(job==IntPtr.Zero)throw new System.ComponentModel.Win32Exception();
    PROCESS_INFORMATION pi=new PROCESS_INFORMATION(); bool created=false;IntPtr inputRead=IntPtr.Zero,inputWrite=IntPtr.Zero,outputRead=IntPtr.Zero,outputWrite=IntPtr.Zero,pseudo=IntPtr.Zero,attributesList=IntPtr.Zero;bool attributesInitialized=false;Thread outputPump=null;System.IO.FileStream terminalOutput=null;
    try {
      EXTENDED_LIMIT limits=new EXTENDED_LIMIT();limits.basic.flags=0x2000|0x200|0x8;limits.basic.activeProcesses=pids;limits.jobMemory=new UIntPtr(memoryMb*1024*1024);if(!SetInformationJobObject(job,9,ref limits,(uint)Marshal.SizeOf(limits)))throw new System.ComponentModel.Win32Exception();
      SECURITY_ATTRIBUTES attributes=new SECURITY_ATTRIBUTES();attributes.length=Marshal.SizeOf(attributes);attributes.inherit=terminal==null?1:0;
      if(!CreatePipe(out inputRead,out inputWrite,ref attributes,0)||!SetHandleInformation(inputWrite,1,0))throw new System.ComponentModel.Win32Exception();
      STARTUPINFO si=new STARTUPINFO(); si.cb=Marshal.SizeOf(si);si.flags=0x100;si.input=inputRead;si.output=GetStdHandle(-11);si.error=GetStdHandle(-12);
      StringBuilder command=new StringBuilder(Quote(executable));foreach(string arg in args)command.Append(" ").Append(Quote(arg));
      if(terminal==null) {
        if(!CreateProcess(executable,command,IntPtr.Zero,IntPtr.Zero,true,4|0x08000000,IntPtr.Zero,cwd,ref si,out pi))throw new System.ComponentModel.Win32Exception();
      } else {
        if(!CreatePipe(out outputRead,out outputWrite,ref attributes,0))throw new System.ComponentModel.Win32Exception();
        int hr=CreatePseudoConsole(new COORD(Convert.ToInt32(terminal["columns"]),Convert.ToInt32(terminal["rows"])),inputRead,outputWrite,0,out pseudo);if(hr!=0)Marshal.ThrowExceptionForHR(hr);
        // Drain independently before starting or closing ConPTY; teardown can emit a final frame.
        terminalOutput=new System.IO.FileStream(new Microsoft.Win32.SafeHandles.SafeFileHandle(outputRead,true),System.IO.FileAccess.Read);outputRead=IntPtr.Zero;
        outputPump=new Thread(()=>{try{terminalOutput.CopyTo(Console.OpenStandardOutput());}catch(System.IO.IOException){}finally{terminalOutput.Dispose();}});outputPump.IsBackground=true;outputPump.Start();
        IntPtr size=IntPtr.Zero;InitializeProcThreadAttributeList(IntPtr.Zero,1,0,ref size);attributesList=Marshal.AllocHGlobal(size);
        if(!InitializeProcThreadAttributeList(attributesList,1,0,ref size))throw new System.ComponentModel.Win32Exception();attributesInitialized=true;
        if(!UpdateProcThreadAttribute(attributesList,0,new IntPtr(0x00020016),pseudo,new IntPtr(IntPtr.Size),IntPtr.Zero,IntPtr.Zero))throw new System.ComponentModel.Win32Exception();
        // Explicit null standard handles prevent inheriting the helper's redirected pipes.
        STARTUPINFOEX extended=new STARTUPINFOEX();extended.startup.cb=Marshal.SizeOf(extended);extended.startup.flags=0x100;extended.attributes=attributesList;
        if(!CreateTerminalProcess(executable,command,IntPtr.Zero,IntPtr.Zero,false,4|0x00080000,IntPtr.Zero,cwd,ref extended,out pi))throw new System.ComponentModel.Win32Exception();
        CloseHandle(outputWrite);outputWrite=IntPtr.Zero;
      }
      created=true;
      if(!AssignProcessToJobObject(job,pi.process))throw new System.ComponentModel.Win32Exception();
      CloseHandle(inputRead);inputRead=IntPtr.Zero;
      var childInput=new System.IO.FileStream(new Microsoft.Win32.SafeHandles.SafeFileHandle(inputWrite,true),System.IO.FileAccess.Write);inputWrite=IntPtr.Zero;
      Thread watchdog=new Thread(()=>{try{string line;while((line=Console.ReadLine())!=null){var message=new System.Web.Script.Serialization.JavaScriptSerializer().Deserialize<System.Collections.Generic.Dictionary<string,object>>(line);string type=(string)message["type"];if(type=="write"){byte[] bytes=Convert.FromBase64String((string)message["data"]);childInput.Write(bytes,0,bytes.Length);childInput.Flush();}else if(type=="eof")childInput.Dispose();else if(type=="resize"&&pseudo!=IntPtr.Zero){int hr=ResizePseudoConsole(pseudo,new COORD(Convert.ToInt32(message["columns"]),Convert.ToInt32(message["rows"])));if(hr!=0)Marshal.ThrowExceptionForHR(hr);}else throw new InvalidOperationException("Unknown process control message");}}catch(Exception error){Console.Error.WriteLine(error.Message);}finally{childInput.Dispose();TerminateJobObject(job,130);}});watchdog.IsBackground=true;watchdog.Start();
      if(ResumeThread(pi.thread)==0xffffffff)throw new System.ComponentModel.Win32Exception();
      WaitForSingleObject(pi.process,0xffffffff);uint code;if(!GetExitCodeProcess(pi.process,out code))throw new System.ComponentModel.Win32Exception();return (int)code;
    } finally {
      TerminateJobObject(job,130);if(created){TerminateProcess(pi.process,130);CloseHandle(pi.thread);CloseHandle(pi.process);}
      if(inputRead!=IntPtr.Zero)CloseHandle(inputRead);if(inputWrite!=IntPtr.Zero)CloseHandle(inputWrite);if(outputWrite!=IntPtr.Zero)CloseHandle(outputWrite);if(outputRead!=IntPtr.Zero)CloseHandle(outputRead);
      if(pseudo!=IntPtr.Zero)ClosePseudoConsole(pseudo);if(outputPump!=null)outputPump.Join(2000);
      if(attributesInitialized)DeleteProcThreadAttributeList(attributesList);if(attributesList!=IntPtr.Zero)Marshal.FreeHGlobal(attributesList);CloseHandle(job);
    }
  }
}
'@
Add-Type -TypeDefinition $source -ReferencedAssemblies 'System.Web.Extensions.dll' -OutputAssembly $OutputFile -OutputType ConsoleApplication
