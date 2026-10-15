param([Parameter(Mandatory=$true)][ValidateSet('directory','pipe')][string]$Mode,[Parameter(Mandatory=$true)][string]$Target)
$ErrorActionPreference = 'Stop'
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ZeroPipeAcl {
  [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool ConvertStringSecurityDescriptorToSecurityDescriptor(string text,uint revision,out IntPtr descriptor,out uint size);
  [DllImport("advapi32.dll",SetLastError=true)] static extern bool GetSecurityDescriptorDacl(IntPtr descriptor,out bool present,out IntPtr dacl,out bool defaulted);
  [DllImport("advapi32.dll",CharSet=CharSet.Unicode)] static extern uint SetNamedSecurityInfo(string name,int type,uint info,IntPtr owner,IntPtr group,IntPtr dacl,IntPtr sacl);
  [DllImport("advapi32.dll",CharSet=CharSet.Unicode)] static extern uint GetNamedSecurityInfo(string name,int type,uint info,out IntPtr owner,out IntPtr group,out IntPtr dacl,out IntPtr sacl,out IntPtr descriptor);
  [DllImport("advapi32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool ConvertSecurityDescriptorToStringSecurityDescriptor(IntPtr descriptor,uint revision,uint info,out IntPtr text,out uint size);
  [DllImport("kernel32.dll")] static extern IntPtr LocalFree(IntPtr memory);
  public static string Apply(string name,string sid,bool directory) {
    IntPtr descriptor=IntPtr.Zero,actual=IntPtr.Zero,text=IntPtr.Zero;
    try {
      uint size; if(!ConvertStringSecurityDescriptorToSecurityDescriptor((directory?"D:P(A;OICI;FA;;;":"D:P(A;;GA;;;")+sid+")",1,out descriptor,out size))throw new System.ComponentModel.Win32Exception();
      bool present,defaulted;IntPtr dacl;
      if(!GetSecurityDescriptorDacl(descriptor,out present,out dacl,out defaulted)||!present)throw new System.ComponentModel.Win32Exception();
      uint result=SetNamedSecurityInfo(name,1,0x80000004,IntPtr.Zero,IntPtr.Zero,dacl,IntPtr.Zero);
      if(result!=0)throw new System.ComponentModel.Win32Exception((int)result);
      IntPtr owner,group,sacl;
      result=GetNamedSecurityInfo(name,1,4,out owner,out group,out dacl,out sacl,out actual);
      if(result!=0)throw new System.ComponentModel.Win32Exception((int)result);
      if(!ConvertSecurityDescriptorToStringSecurityDescriptor(actual,1,4,out text,out size))throw new System.ComponentModel.Win32Exception();
      return Marshal.PtrToStringUni(text);
    } finally { if(text!=IntPtr.Zero)LocalFree(text);if(actual!=IntPtr.Zero)LocalFree(actual);if(descriptor!=IntPtr.Zero)LocalFree(descriptor); }
  }
}
'@
$sddl = [ZeroPipeAcl]::Apply($Target, $identity.Value, ($Mode -eq 'directory'))
$descriptor = New-Object System.Security.AccessControl.RawSecurityDescriptor($sddl)
if (($descriptor.ControlFlags -band [System.Security.AccessControl.ControlFlags]::DiscretionaryAclProtected) -eq 0) { throw 'ACL must be protected from inheritance' }
if ($descriptor.DiscretionaryAcl.Count -ne 1) { throw 'ACL must have exactly one principal' }
$ace = $descriptor.DiscretionaryAcl[0]
if ($ace.SecurityIdentifier.Value -ne $identity.Value -or $ace.AceQualifier -ne 'AccessAllowed') { throw 'ACL does not match the current user' }
@{ protected = $true; kind = $Mode; principals = 1 } | ConvertTo-Json -Compress
